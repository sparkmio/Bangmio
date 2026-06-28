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

// ===== 环境判断 =====
// 生产 web（Cloudflare Pages）：https 域名，走后端 Pages Functions，OAuth 回调 = 当前域名
// 本地（vite dev / Electron file:// / Capacitor）：走本地 app + localhost 回调
export function isProdWeb() {
  if (typeof window === 'undefined') return false
  if (window.electronAPI) return false
  const origin = window.location.origin
  return origin.startsWith('https://') && !origin.includes('localhost')
}

// 后端 baseURL：web 用相对路径（CF Pages 同源 / vite 代理）；非 http(s) origin（Electron file:// / Capacitor）用部署后的后端
function getBackendBase() {
  if (typeof window === 'undefined') return '/api/v1'
  const origin = window.location.origin
  if (!origin.startsWith('http://') && !origin.startsWith('https://')) {
    return 'https://bangmio.pages.dev/api/v1'
  }
  return '/api/v1'
}

// 本地 OAuth 应用配置（dev / Electron 用，回调 localhost:5173）
export function getOAuthConfig() {
  return {
    clientId: 'bgm64516a3fcf799a59a',
    clientSecret: '88c4a18cc34de8d1d87599482a54d3cf',
    redirectUri: 'http://localhost:5173/login/callback'
  }
}

// OAuth 端点域名（按镜像分流）
function getOauthBase() {
  const mirror = localStorage.getItem('bangmio_mirror') || 'intl'
  return mirror === 'cn' ? 'https://bangumi.lol' : 'https://bgm.tv'
}

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000
})

// 后端代理实例：吐槽箱 / 讨论版 / 豆瓣 / 萌娘百科 / OAuth 换码刷新都走这里（避开 CORS，服务端 China 感知）
const backend = axios.create({
  baseURL: getBackendBase(),
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

backend.interceptors.request.use(config => {
  const token = localStorage.getItem('bangmio_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 统一的 token 刷新（web 走后端 /user/refresh-token，本地走 local app 直接换）
export async function doRefreshToken() {
  const refreshToken = localStorage.getItem('bangmio_refresh_token')
  if (!refreshToken) throw new Error('no refresh token')
  let accessToken, newRefresh, user
  if (isProdWeb()) {
    const res = await backend.post('/user/refresh-token', { refreshToken })
    const d = res.data.data
    accessToken = d.token
    newRefresh = d.refreshToken
    user = d.user
  } else {
    const cfg = getOAuthConfig()
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      refresh_token: refreshToken,
      redirect_uri: cfg.redirectUri
    })
    const tokenRes = await axios.post(`${getOauthBase()}/oauth/access_token`, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000
    })
    accessToken = tokenRes.data.access_token
    newRefresh = tokenRes.data.refresh_token || refreshToken
    if (!accessToken) throw new Error('refresh failed')
    const userRes = await api.get('/v0/me', { headers: { Authorization: `Bearer ${accessToken}` } })
    user = userRes.data
  }
  localStorage.setItem('bangmio_token', accessToken)
  localStorage.setItem('bangmio_refresh_token', newRefresh)
  return { accessToken, refreshToken: newRefresh, user }
}

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
          const { accessToken } = await doRefreshToken()
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
export { backend }
