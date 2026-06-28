import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import router from '../router'
import api, { backend, isProdWeb, getOAuthConfig, doRefreshToken } from '../api/index'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('bangmio_user') || 'null'))
  const token = ref(localStorage.getItem('bangmio_token') || '')
  const refreshToken = ref(localStorage.getItem('bangmio_refresh_token') || '')
  const loading = ref(false)
  const error = ref('')

  const isLoggedIn = computed(() => !!token.value && !!user.value)

  function saveAuth(u, t, rt) {
    user.value = u
    token.value = t
    if (rt) refreshToken.value = rt
    localStorage.setItem('bangmio_user', JSON.stringify(u))
    localStorage.setItem('bangmio_token', t)
    if (rt) localStorage.setItem('bangmio_refresh_token', rt)
  }

  function clearAuth() {
    user.value = null
    token.value = ''
    refreshToken.value = ''
    localStorage.removeItem('bangmio_user')
    localStorage.removeItem('bangmio_token')
    localStorage.removeItem('bangmio_refresh_token')
  }

  function checkAuth() {
    if (token.value) fetchMe()
  }

  async function fetchMe() {
    if (!token.value) return
    try {
      const res = await api.get('/v0/me')
      user.value = res.data
      localStorage.setItem('bangmio_user', JSON.stringify(res.data))
    } catch (err) {
      if (err.response?.status === 401) {
        if (refreshToken.value) {
          try {
            await doRefresh()
            return
          } catch { /* refresh failed */ }
        }
      }
    }
  }

  async function doRefresh() {
    const { accessToken, refreshToken: newRefresh, user: u } = await doRefreshToken()
    saveAuth(u, accessToken, newRefresh)
  }

  async function login(accessToken) {
    loading.value = true
    error.value = ''
    try {
      const res = await api.get('/v0/me', { headers: { Authorization: `Bearer ${accessToken}` } })
      saveAuth(res.data, accessToken, '')
      router.push('/')
    } catch (err) {
      error.value = 'Token 验证失败'
    } finally {
      loading.value = false
    }
  }

  async function oauthLogin(code) {
    loading.value = true
    error.value = ''
    try {
      let user, accessToken, newRefreshToken
      if (isProdWeb()) {
        // 生产 web：走后端换码，secret 留服务端，回调 = bangmio.pages.dev
        const res = await backend.post('/user/oauth-callback', { code })
        const d = res.data.data
        user = d.user
        accessToken = d.token
        newRefreshToken = d.refreshToken
      } else {
        // 本地（dev / Electron）：本地 app + localhost 回调
        const cfg = getOAuthConfig()
        const params = new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: cfg.clientId,
          client_secret: cfg.clientSecret,
          code,
          redirect_uri: cfg.redirectUri
        })
        const tokenRes = await fetch('https://bgm.tv/oauth/access_token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        })
        const tokenData = await tokenRes.json()
        accessToken = tokenData.access_token
        newRefreshToken = tokenData.refresh_token
        if (!accessToken) throw new Error('授权失败')
        const userRes = await api.get('/v0/me', { headers: { Authorization: `Bearer ${accessToken}` } })
        user = userRes.data
      }
      saveAuth(user, accessToken, newRefreshToken)
      router.push('/')
    } catch (err) {
      error.value = '授权失败'
    } finally {
      loading.value = false
    }
  }

  function logout() {
    clearAuth()
    router.push('/')
  }

  return { user, token, loading, error, isLoggedIn, checkAuth, login, oauthLogin, logout, fetchMe }
})
