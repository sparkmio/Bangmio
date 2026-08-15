import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import router from '../router'
import api from '../api/index'
import { authStorage, migrateOldAuthKeys } from '../utils/authStorage'

export const useAuthStore = defineStore('auth', () => {
  // 旧 key 迁移需在读取 state 之前完成（迁移逻辑集中见 authStorage.js）
  migrateOldAuthKeys()

  // ===== State =====
  // Bangmio JWT 体系（新）
  const bangmioToken = ref(authStorage.getBangmioToken())
  const bangmioUser = ref(authStorage.getBangmioUser())
  const bgmToken = ref(authStorage.getBgmTokenCached())

  // Bangmio 用户绑定后的 Bangumi 用户资料（username/avatar/sign 等）
  // Bangumi 直登用户使用下方 `user`，不写入此字段
  const bgmUserProfile = ref(authStorage.getBgmUserProfile())
  const bgmProfileError = ref(false)
  const bgmProfileLoading = ref(false)

  // Bangumi 直登模式
  const token = ref(authStorage.getBangumiToken())
  const user = ref(authStorage.getBangumiUser())

  const loading = ref(false)
  const error = ref('')
  const showBindModal = ref(false)

  // ===== Computed =====
  const isBangmioUser = computed(() => !!bangmioToken.value)
  const isBangumiDirectUser = computed(() => !!token.value && !bangmioToken.value)
  const isAuthenticated = computed(() => !!bangmioToken.value || !!token.value)
  const isBound = computed(() => !!bangmioUser.value?.bgmUid || isBangumiDirectUser.value)
  const effectiveBgmToken = computed(() => {
    if (bangmioToken.value) return bgmToken.value
    return token.value
  })

  // 统一用户对象：屏蔽 Bangmio / Bangumi 直登差异
  // - Bangmio 用户返回 bgmUserProfile（绑定后的 Bangumi 资料）
  // - Bangumi 直登用户返回 user
  // - 都没有返回 null
  const effectiveUser = computed(() => {
    if (bangmioToken.value) return bgmUserProfile.value
    if (token.value) return user.value
    return null
  })

  // 向后兼容：Navbar / Sidebar 等仍在使用 isLoggedIn
  const isLoggedIn = computed(() => !!bangmioToken.value || (!!token.value && !!user.value))

  // ===== 持久化辅助 =====
  function saveBangmioAuth(t, u) {
    bangmioToken.value = t
    bangmioUser.value = u
    authStorage.setBangmioToken(t)
    authStorage.setBangmioUser(u)
  }

  function saveBangumiAuth(t, u) {
    token.value = t
    user.value = u
    authStorage.setBangumiToken(t)
    authStorage.setBangumiUser(u)
  }

  function saveBgmTokenCached(t) {
    bgmToken.value = t || ''
    authStorage.setBgmTokenCached(t)
  }

  function saveBgmUserProfile(profile) {
    bgmUserProfile.value = profile || null
    authStorage.setBgmUserProfile(profile || null)
  }

  function clearBgmUserProfile() {
    bgmUserProfile.value = null
    authStorage.setBgmUserProfile(null)
  }

  function clearBangmioAuth() {
    bangmioToken.value = ''
    bangmioUser.value = null
    bgmToken.value = ''
    bgmUserProfile.value = null
    authStorage.clearBangmio()
  }

  function clearBangumiAuth() {
    token.value = ''
    user.value = null
    authStorage.clearBangumi()
  }

  // 登录/注册成功后根据 redirect query 跳转
  function redirectAfterAuth() {
    const redirect = router.currentRoute.value?.query?.redirect
    if (redirect && typeof redirect === 'string') {
      return router.push(redirect)
    } else {
      return router.push('/')
    }
  }

  // ===== Actions =====

  // Bangmio 邮箱密码登录
  async function loginWithBangmio(email, password, captchaToken) {
    loading.value = true
    error.value = ''
    try {
      const res = await api.post('/auth/login', { email, password, captchaToken })
      const data = res.data?.data
      if (!data?.token || !data?.user) {
        throw new Error('登录响应异常，缺少必要信息')
      }
      saveBangmioAuth(data.token, data.user)
      // 已绑定用户登录后拉取 bgm token 与用户资料到本地缓存
      if (data.user?.bgmUid) {
        await fetchBgmToken()
        await fetchBgmUserProfile()
      }
      error.value = ''
      await redirectAfterAuth()
    } catch (err) {
      error.value = err.response?.data?.error || err.message || '登录失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // 发送邮箱验证码（注册流程）
  async function sendVerificationCode(email, captchaToken) {
    loading.value = true
    error.value = ''
    try {
      const res = await api.post('/auth/send-code', { email, captchaToken, purpose: 'register' })
      return res.data.data
    } catch (err) {
      error.value = err.response?.data?.error || '验证码发送失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Bangmio 邮箱密码注册（带验证码）
  async function registerWithBangmio(email, password, code, captchaToken) {
    loading.value = true
    error.value = ''
    try {
      const res = await api.post('/auth/register', { email, password, code, captchaToken })
      saveBangmioAuth(res.data.data.token, res.data.data.user)
      // 注册成功后跳转绑定页（强制绑定 Bangumi）
      router.push({ name: 'BindBangumi' })
    } catch (err) {
      error.value = err.response?.data?.error || '注册失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // 获取当前用户解密后的 Bangumi Access Token（绑定后调用）
  // 修复绑定后功能异常：Bangmio 用户登录后需拉取 bgm token 缓存到本地
  async function fetchBgmToken() {
    if (!bangmioToken.value) return null
    try {
      const res = await api.get('/auth/bgm-token')
      if (res.data?.data?.bgmToken) {
        saveBgmTokenCached(res.data.data.bgmToken)
        return res.data.data.bgmToken
      }
    } catch (err) {
      // 404 表示未绑定，静默处理
      if (err.response?.status !== 404) {
        // 其他错误静默记录
      }
    }
    return null
  }

  // 拉取并缓存 Bangumi 用户资料（username/avatar/sign 等）
  // Bangmio 用户绑定后调用，使 Profile / 番剧功能页能正常显示
  // 失败时静默，不影响主流程
  async function fetchBgmUserProfile() {
    if (!bangmioToken.value) return null
    bgmProfileLoading.value = true
    bgmProfileError.value = false
    try {
      // 首次注册、换设备或 OAuth 回调后本地尚无缓存时，先取绑定 token，
      // 避免 /user/me 因携带空 token 而失败。
      if (!bgmToken.value) await fetchBgmToken()
      if (!bgmToken.value) throw new Error('未绑定 Bangumi 账号')
      const res = await api.get('/user/me')
      const profile = res.data?.data || null
      if (!profile?.username) throw new Error('未获取到 Bangumi 用户资料')
      saveBgmUserProfile(profile)
      bgmProfileError.value = false
      return profile
    } catch {
      bgmProfileError.value = true
      return undefined
    } finally {
      bgmProfileLoading.value = false
    }
  }

  // OAuth 绑定 Bangumi：获取授权 URL（带 state JWT）
  async function getOAuthBindUrl() {
    const res = await api.get('/auth/oauth-bind-url')
    return res.data.data.url
  }

  // OAuth 绑定回调：用 code + state 完成绑定
  async function oauthBindBangumi(code, state) {
    loading.value = true
    error.value = ''
    try {
      const res = await api.post('/auth/oauth-bind-callback', { code, state })
      saveBangmioAuth(res.data.data.token, res.data.data.user)
      if (res.data.data.bgmToken) {
        saveBgmTokenCached(res.data.data.bgmToken)
      }
      // OAuth 绑定成功后拉取 Bangumi 用户资料
      await fetchBgmUserProfile()
      return res.data.data
    } catch (err) {
      error.value = err.response?.data?.error || 'OAuth 绑定失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Bangumi access token 直登
  async function loginWithBangumi(accessToken) {
    loading.value = true
    error.value = ''
    try {
      const res = await api.post('/user/auth', { token: accessToken })
      const data = res.data?.data
      if (!data?.user) {
        throw new Error('Token 验证响应异常，缺少用户信息')
      }
      saveBangumiAuth(accessToken, data.user)
      error.value = ''
      await redirectAfterAuth()
    } catch (err) {
      error.value = err.response?.data?.error || err.message || 'Token 验证失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Bangumi OAuth 回调
  async function oauthLogin(code, state) {
    loading.value = true
    error.value = ''
    try {
      const res = await api.post('/user/oauth-callback', { code, state })
      const data = res.data?.data
      if (!data?.token || !data?.user) {
        throw new Error('授权响应异常，缺少必要信息')
      }
      saveBangumiAuth(data.token, data.user)
      error.value = ''
      await redirectAfterAuth()
    } catch (err) {
      error.value = err.response?.data?.error || err.message || '授权失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // 绑定 Bangumi 账号（仅 Bangmio 用户）
  async function bindBangumi(bangumiTokenToBind) {
    loading.value = true
    error.value = ''
    try {
      const res = await api.post('/auth/bind-bangumi', { bangumiToken: bangumiTokenToBind })
      saveBangmioAuth(res.data.data.token, res.data.data.user)
      saveBgmTokenCached(bangumiTokenToBind)
      // 绑定成功后拉取 Bangumi 用户资料，使 Profile / 番剧功能页立即可用
      await fetchBgmUserProfile()
      return res.data.data
    } catch (err) {
      error.value = err.response?.data?.error || '绑定失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // 解绑 Bangumi 账号
  async function unbindBangumi() {
    loading.value = true
    error.value = ''
    try {
      await api.delete('/auth/bind-bangumi')
      if (bangmioUser.value) {
        bangmioUser.value = { ...bangmioUser.value, bgmUid: null }
        authStorage.setBangmioUser(bangmioUser.value)
      }
      saveBgmTokenCached('')
      // 解绑后清空缓存的 Bangumi 用户资料
      clearBgmUserProfile()
    } catch (err) {
      error.value = err.response?.data?.error || '解绑失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // 刷新 Bangmio JWT
  async function refreshBangmioToken() {
    if (!bangmioToken.value) return null
    try {
      const res = await api.post('/auth/refresh', null, {
        headers: { Authorization: `Bearer ${bangmioToken.value}` }
      })
      saveBangmioAuth(res.data.data.token, res.data.data.user)
      return res.data.data
    } catch (err) {
      clearBangmioAuth()
      throw err
    }
  }

  // 获取当前 Bangmio 用户信息
  async function fetchCurrentUser() {
    if (!bangmioToken.value) return
    try {
      const res = await api.get('/auth/me')
      bangmioUser.value = res.data.data.user
      authStorage.setBangmioUser(res.data.data.user)
    } catch {
      // 401 由拦截器处理
    }
  }

  // 获取 Bangumi 用户信息（直登用户）
  async function fetchMe() {
    if (!token.value) return
    try {
      const res = await api.get('/user/me')
      user.value = res.data.data
      authStorage.setBangumiUser(res.data.data)
    } catch {
      // ignore
    }
  }

  // 应用启动时检查认证状态
  async function checkAuth() {
    if (bangmioToken.value) {
      await fetchCurrentUser()
      // 已绑定但本地无 bgm token 缓存（如换设备登录）时，从服务器拉取解密后的 token
      if (bangmioUser.value?.bgmUid && !bgmToken.value) {
        await fetchBgmToken()
      }
      // 已绑定但本地无 bgmUserProfile（如换设备登录）时，拉取 Bangumi 用户资料
      if (bangmioUser.value?.bgmUid && !bgmUserProfile.value) {
        for (let i = 0; i < 2; i++) {
          await fetchBgmUserProfile()
          if (bgmUserProfile.value) break
          if (i === 0) await new Promise(r => setTimeout(r, 1000))
        }
      }
    } else if (token.value) {
      fetchMe()
    }
  }

  // 修改密码（仅 Bangmio 用户）
  async function changePassword(currentPassword, newPassword) {
    loading.value = true
    error.value = ''
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword })
    } catch (err) {
      error.value = err.response?.data?.error || '修改密码失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // 忘记密码：发送重置验证码
  async function forgotPassword(email, captchaToken) {
    loading.value = true
    error.value = ''
    try {
      await api.post('/auth/forgot-password', { email, captchaToken })
    } catch (err) {
      error.value = err.response?.data?.error || '发送验证码失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // 重置密码：用邮箱验证码设置新密码
  async function resetPassword(email, code, newPassword) {
    loading.value = true
    error.value = ''
    try {
      await api.post('/auth/reset-password', { email, code, newPassword })
    } catch (err) {
      error.value = err.response?.data?.error || '重置密码失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // 退出登录：清空所有 token 和 user
  function logout() {
    clearBangmioAuth()
    clearBangumiAuth()
    showBindModal.value = false
    router.push('/')
  }

  function setShowBindModal(value) {
    showBindModal.value = value
  }

  return {
    // State
    user,
    token,
    bangmioToken,
    bangmioUser,
    bgmToken,
    bgmUserProfile,
    bgmProfileError,
    bgmProfileLoading,
    loading,
    error,
    showBindModal,
    // Computed
    isLoggedIn,
    isBangmioUser,
    isBangumiDirectUser,
    isAuthenticated,
    isBound,
    effectiveBgmToken,
    effectiveUser,
    // Actions
    checkAuth,
    loginWithBangmio,
    registerWithBangmio,
    sendVerificationCode,
    fetchBgmToken,
    fetchBgmUserProfile,
    getOAuthBindUrl,
    oauthBindBangumi,
    loginWithBangumi,
    oauthLogin,
    bindBangumi,
    unbindBangumi,
    refreshBangmioToken,
    fetchCurrentUser,
    fetchMe,
    changePassword,
    forgotPassword,
    resetPassword,
    logout,
    setShowBindModal
  }
})
