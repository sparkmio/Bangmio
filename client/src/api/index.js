import axios from 'axios'

// 原版设计：所有 Bangumi API 请求走后端 /api/v1 代理（同源无 CORS，后端 China 感知切镜像）
// 不要改成直连 api.bgm.tv —— 浏览器 CORS 会拦截
const baseURL = import.meta.env.VITE_API_BASE || '/api/v1'

const api = axios.create({
  baseURL,
  timeout: 15000
})

// 后端代理实例（与 api 同源 /api/v1，语义上区分用于 comments/douban/moegirl/user OAuth）
const backend = axios.create({
  baseURL,
  timeout: 15000
})

// ===== 环境判断 =====
// 生产 web（Cloudflare Pages）：https 域名，走后端 Pages Functions，OAuth 回调 = 当前域名
// 本地（vite dev / Electron file:// / Capacitor）：走本地 app + localhost 回调
export function isProdWeb() {
  if (typeof window === 'undefined') return false
  if (window.electronAPI) return false
  const origin = window.location.origin
  return origin.startsWith('https://') && !origin.includes('localhost')
}

// 本地 OAuth 应用配置（dev / Electron 用，回调 localhost:5173）
export function getOAuthConfig() {
  return {
    clientId: 'bgm64516a3fcf799a59a',
    clientSecret: '88c4a18cc34de8d1d87599482a54d3cf',
    redirectUri: 'http://localhost:5173/login/callback'
  }
}

// OAuth 端点域名（按镜像分流，本地环境直连用）
function getOauthBase() {
  const mirror = localStorage.getItem('bangmio_mirror') || 'intl'
  return mirror === 'cn' ? 'https://bangumi.lol' : 'https://bgm.tv'
}

let isRefreshing = false
let pendingRequests = []

function onRefreshed(token) {
  pendingRequests.forEach(cb => cb(token))
  pendingRequests = []
}

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
    // 本地直连 Bangumi 获取用户信息（不走 /api/v1 代理，本地可能没起后端）
    const userRes = await axios.get(`${getOauthBase()}/v0/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 15000
    })
    user = userRes.data
  }
  localStorage.setItem('bangmio_token', accessToken)
  localStorage.setItem('bangmio_refresh_token', newRefresh)
  localStorage.setItem('bangmio_user', JSON.stringify(user))
  return { accessToken, refreshToken: newRefresh, user }
}

api.interceptors.request.use(config => {
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

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('bangmio_refresh_token')
      if (refreshToken && !originalRequest.url?.includes('/user/refresh-token')) {
        originalRequest._retry = true
        if (!isRefreshing) {
          isRefreshing = true
          try {
            const { accessToken } = await doRefreshToken()
            onRefreshed(accessToken)
            originalRequest.headers.Authorization = `Bearer ${accessToken}`
            return api(originalRequest)
          } catch {
            onRefreshed(null)
            localStorage.removeItem('bangmio_token')
            localStorage.removeItem('bangmio_user')
            localStorage.removeItem('bangmio_refresh_token')
          } finally {
            isRefreshing = false
          }
        } else {
          return new Promise((resolve, reject) => {
            pendingRequests.push(token => {
              if (token) {
                originalRequest.headers.Authorization = `Bearer ${token}`
                resolve(api(originalRequest))
              } else {
                reject(error)
              }
            })
          })
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
