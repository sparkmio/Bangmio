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
      const res = await api.get('/user/me')
      user.value = res.data.data
      localStorage.setItem('bangmio_user', JSON.stringify(res.data.data))
    } catch (err) {
      if (err.response?.status === 401) {
        if (refreshToken.value) {
          try {
            await doRefresh()
            return
          } catch {
            /* refresh failed */
          }
        }
      }
    }
  }

  async function doRefresh() {
    const res = await api.post('/user/refresh-token', { refreshToken: refreshToken.value })
    const u = res.data.data.user
    const t = res.data.data.token
    const rt = res.data.data.refreshToken || refreshToken.value
    saveAuth(u, t, rt)
  }

  async function login(accessToken) {
    loading.value = true
    error.value = ''
    try {
      const res = await api.post('/user/auth', { token: accessToken })
      saveAuth(res.data.data.user, accessToken, res.data.data.refreshToken)
      router.push('/')
    } catch (err) {
      error.value = err.response?.data?.error || 'Token 验证失败'
    } finally {
      loading.value = false
    }
  }

  async function oauthLogin(code) {
    loading.value = true
    error.value = ''
    try {
      const res = await api.post('/user/oauth-callback', { code })
      saveAuth(res.data.data.user, res.data.data.token, res.data.data.refreshToken)
      router.push('/')
    } catch (err) {
      error.value = err.response?.data?.error || '授权失败'
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
