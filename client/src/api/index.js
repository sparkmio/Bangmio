import axios from 'axios'

const BGM_API = 'https://api.bgm.tv'
const BGM_PROXY = 'https://api.bangumi.lol'

function getBaseURL() {
  const mirror = localStorage.getItem('bangmio_mirror') || 'intl'
  return mirror === 'cn' ? BGM_PROXY : BGM_API
}

function rewriteImageUrls(data) {
  if (typeof data === 'string') return data.replace(/lain\.bgm\.tv/g, 'lain.bangumi.lol')
  if (Array.isArray(data)) return data.map(rewriteImageUrls)
  if (data && typeof data === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(data)) out[k] = rewriteImageUrls(v)
    return out
  }
  return data
}

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000
})

api.interceptors.request.use(config => {
  config.baseURL = getBaseURL()
  const token = localStorage.getItem('bangmio_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  try {
    const user = JSON.parse(localStorage.getItem('bangmio_user') || '{}')
    if (user.username) {
      config.headers['X-Bangumi-Username'] = user.username
    }
  } catch {}
  return config
})

api.interceptors.response.use(
  response => {
    if (response.data) {
      response.data = rewriteImageUrls(response.data)
    }
    return response
  },
  async error => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('bangmio_refresh_token')
      if (refreshToken && !originalRequest.url?.includes('/v0/users/-/')) {
        originalRequest._retry = true
        try {
          const params = new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: 'bgm61416a088eff71580',
            client_secret: '6b8055c0159fcc5e998059536813026f',
            refresh_token: refreshToken,
            redirect_uri: window.location.origin + '/login/callback'
          })
          const tokenRes = await axios.post('https://bgm.tv/oauth/access_token', params.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 15000
          })
          const accessToken = tokenRes.data.access_token
          const newRefreshToken = tokenRes.data.refresh_token || refreshToken
          localStorage.setItem('bangmio_token', accessToken)
          localStorage.setItem('bangmio_refresh_token', newRefreshToken)
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return api(originalRequest)
        } catch {
          localStorage.removeItem('bangmio_token')
          localStorage.removeItem('bangmio_user')
          localStorage.removeItem('bangmio_refresh_token')
        }
      } else {
        localStorage.removeItem('bangmio_token')
        localStorage.removeItem('bangmio_user')
        localStorage.removeItem('bangmio_refresh_token')
      }
    }
    return Promise.reject(error)
  }
)

export default api
