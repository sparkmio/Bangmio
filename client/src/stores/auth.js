import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import router from '../router'
import api from '../api/index'

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
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: 'bgm61416a088eff71580',
      client_secret: '6b8055c0159fcc5e998059536813026f',
      refresh_token: refreshToken.value,
      redirect_uri: window.location.origin + '/login/callback'
    })
    const tokenRes = await fetch('https://bgm.tv/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    })
    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token
    const newRefreshToken = tokenData.refresh_token || refreshToken.value
    if (!accessToken) throw new Error('Token refresh failed')
    const userRes = await api.get('/v0/me', { headers: { Authorization: `Bearer ${accessToken}` } })
    saveAuth(userRes.data, accessToken, newRefreshToken)
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
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: 'bgm61416a088eff71580',
        client_secret: '6b8055c0159fcc5e998059536813026f',
        code,
        redirect_uri: window.location.origin + '/login/callback'
      })
      const tokenRes = await fetch('https://bgm.tv/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      })
      const tokenData = await tokenRes.json()
      const accessToken = tokenData.access_token
      const newRefreshToken = tokenData.refresh_token
      if (!accessToken) throw new Error('授权失败')
      const userRes = await api.get('/v0/me', { headers: { Authorization: `Bearer ${accessToken}` } })
      saveAuth(userRes.data, accessToken, newRefreshToken)
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
