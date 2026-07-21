import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import router from '../router'
import api from '../api/index'

export const useAuthStore = defineStore('auth', () => {
  // ===== State =====
  // Bangmio JWT 体系（新）
  const bangmioToken = ref(localStorage.getItem('bangmio_token') || '')
  const bangmioUser = ref(JSON.parse(localStorage.getItem('bangmio_user') || 'null'))
  const bgmToken = ref(localStorage.getItem('bgm_token_cached') || '')

  // Bangmio 用户绑定后的 Bangumi 用户资料（username/avatar/sign 等）
  // Bangumi 直登用户使用下方 `user`，不写入此字段
  const bgmUserProfile = ref(JSON.parse(localStorage.getItem('bgm_user_profile') || 'null'))

  // Bangumi 直登模式（保留，从旧 key 迁移）
  const token = ref(localStorage.getItem('bangumi_token') || '')
  const user = ref(JSON.parse(localStorage.getItem('bangumi_user') || 'null'))

  const loading = ref(false)
  const error = ref('')
  const showBindModal = ref(false)

  // ===== 旧 localStorage key 迁移 =====
  // 旧代码把 Bangumi token/user 存在 'bangmio_token'/'bangmio_user'
  // 旧值若不是 JWT，则迁移到 'bangumi_token'/'bangumi_user'
  ;(function migrateOldKeys() {
    const oldToken = localStorage.getItem('bangmio_token')
    const oldUser = localStorage.getItem('bangmio_user')
    // JWT 格式：三段 base64 以点分隔
    const isJwt = oldToken && oldToken.split('.').length === 3
    if (oldToken && !isJwt) {
      if (!localStorage.getItem('bangumi_token')) {
        localStorage.setItem('bangumi_token', oldToken)
        token.value = oldToken
      }
      localStorage.removeItem('bangmio_token')
      bangmioToken.value = ''
    }
    if (oldUser) {
      try {
        const parsed = JSON.parse(oldUser)
        // 旧 Bangumi user 有 username 字段，新 Bangmio user 有 email 字段
        if (parsed && !parsed.email) {
          if (!localStorage.getItem('bangumi_user')) {
            localStorage.setItem('bangumi_user', oldUser)
            user.value = parsed
          }
          localStorage.removeItem('bangmio_user')
          bangmioUser.value = null
        }
      } catch {
        // ignore
      }
    }
  })()

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
    localStorage.setItem('bangmio_token', t)
    localStorage.setItem('bangmio_user', JSON.stringify(u))
  }

  function saveBangumiAuth(t, u) {
    token.value = t
    user.value = u
    localStorage.setItem('bangumi_token', t)
    localStorage.setItem('bangumi_user', JSON.stringify(u))
  }

  function saveBgmTokenCached(t) {
    bgmToken.value = t || ''
    if (t) {
      localStorage.setItem('bgm_token_cached', t)
    } else {
      localStorage.removeItem('bgm_token_cached')
    }
  }

  function saveBgmUserProfile(profile) {
    bgmUserProfile.value = profile || null
    if (profile) {
      localStorage.setItem('bgm_user_profile', JSON.stringify(profile))
    } else {
      localStorage.removeItem('bgm_user_profile')
    }
  }

  function clearBgmUserProfile() {
    bgmUserProfile.value = null
    localStorage.removeItem('bgm_user_profile')
  }

  function clearBangmioAuth() {
    bangmioToken.value = ''
    bangmioUser.value = null
    bgmToken.value = ''
    bgmUserProfile.value = null
    localStorage.removeItem('bangmio_token')
    localStorage.removeItem('bangmio_user')
    localStorage.removeItem('bgm_token_cached')
    localStorage.removeItem('bgm_user_profile')
  }

  function clearBangumiAuth() {
    token.value = ''
    user.value = null
    localStorage.removeItem('bangumi_token')
    localStorage.removeItem('bangumi_user')
  }

  // 登录/注册成功后根据 redirect query 跳转
  function redirectAfterAuth() {
    const redirect = router.currentRoute.value?.query?.redirect
    if (redirect && typeof redirect === 'string') {
      router.push(redirect)
    } else {
      router.push('/')
    }
  }

  // ===== Actions =====

  // Bangmio 邮箱密码登录
  async function loginWithBangmio(email, password) {
    loading.value = true
    error.value = ''
    try {
      const res = await api.post('/auth/login', { email, password })
      saveBangmioAuth(res.data.data.token, res.data.data.user)
      // 已绑定用户登录后拉取 bgm token 与用户资料到本地缓存
      if (res.data.data.user?.bgmUid) {
        await fetchBgmToken()
        await fetchBgmUserProfile()
      }
      redirectAfterAuth()
    } catch (err) {
      error.value = err.response?.data?.error || '登录失败'
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
    if (!bangmioToken.value) return
    try {
      const res = await api.get('/user/me')
      saveBgmUserProfile(res.data?.data || null)
    } catch {
      // 静默失败：不抛错、不写 error，避免阻断绑定/登录主流程
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
      saveBangumiAuth(accessToken, res.data.data.user)
      redirectAfterAuth()
    } catch (err) {
      error.value = err.response?.data?.error || 'Token 验证失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Bangumi OAuth 回调
  async function oauthLogin(code) {
    loading.value = true
    error.value = ''
    try {
      const res = await api.post('/user/oauth-callback', { code })
      saveBangumiAuth(res.data.data.token, res.data.data.user)
      redirectAfterAuth()
    } catch (err) {
      error.value = err.response?.data?.error || '授权失败'
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
        localStorage.setItem('bangmio_user', JSON.stringify(bangmioUser.value))
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
      localStorage.setItem('bangmio_user', JSON.stringify(res.data.data.user))
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
      localStorage.setItem('bangumi_user', JSON.stringify(res.data.data))
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
        await fetchBgmUserProfile()
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
