import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import { authStorage } from '../utils/authStorage'
import router from '../router'

const baseURL = import.meta.env.VITE_API_BASE || '/api/v1'

const api = axios.create({
  baseURL,
  timeout: 15000
})

/**
 * 创建可取消的请求控制器
 * Axios 1.x 支持 AbortController，可通过 signal 配置传入实现请求取消
 * @returns {{ signal: AbortSignal, cancel: Function }} 包含 signal 和 cancel 方法
 */
export function createCancelToken() {
  const controller = new AbortController()
  return {
    signal: controller.signal,
    cancel: reason => controller.abort(reason)
  }
}

/**
 * 判断错误是否为请求被取消（用于在 catch 中跳过取消类错误）
 * @param {Error} err
 * @returns {boolean}
 */
export function isCanceled(err) {
  return err?.name === 'AbortError' || err?.code === 'ERR_CANCELED' || err?.message === 'canceled'
}

let isRefreshing = false
let pendingRequests = []

function onRefreshed(token) {
  pendingRequests.forEach(cb => cb(token))
  pendingRequests = []
}

/**
 * 安全获取 auth store；Pinia 未激活时返回 null
 * @returns {ReturnType<typeof useAuthStore> | null}
 */
function getAuthStore() {
  try {
    return useAuthStore()
  } catch {
    return null
  }
}

/**
 * 根据请求 URL 选择合适的 token
 * - /auth/* 使用 bangmioToken（JWT）
 * - /user/* /anime* /collection* /comments* 使用 effectiveBgmToken
 * - 其他通用 API 优先 bangmioToken，回退 effectiveBgmToken
 * @param {string} url
 * @param {ReturnType<typeof useAuthStore> | null} auth
 * @returns {string | null}
 */
/** 这些端点以 Bangumi access token 调用，需要一并携带其用户名。 */
function isBangumiApiUrl(url) {
  return (
    url.startsWith('/user/') ||
    url.startsWith('/anime') ||
    url.startsWith('/collection') ||
    url.startsWith('/comments')
  )
}
function getAuthTokenForUrl(url, auth) {
  if (!auth) return null
  if (url.startsWith('/auth/')) {
    return auth.bangmioToken || null
  }
  if (isBangumiApiUrl(url)) {
    return auth.effectiveBgmToken || null
  }
  return auth.bangmioToken || auth.effectiveBgmToken || null
}

api.interceptors.request.use(config => {
  const auth = getAuthStore()
  const url = config.url || ''

  if (auth) {
    const tokenForRequest = getAuthTokenForUrl(url, auth)
    if (tokenForRequest) {
      config.headers.Authorization = `Bearer ${tokenForRequest}`
    }
    // 收藏等 Bangumi 代理端点需要用户名。Bangmio 已绑定用户也必须携带，
    // 否则后端会因缺少 X-Bangumi-Username 拒绝请求。
    const bangumiUsername = auth.effectiveUser?.username || auth.user?.username
    if (isBangumiApiUrl(url) && bangumiUsername) {
      config.headers['X-Bangumi-Username'] = bangumiUsername
    }
  } else {
    // Pinia 未激活时回退到 localStorage
    const bangumiToken = authStorage.getBangumiToken() || authStorage.getBangmioToken()
    if (bangumiToken) {
      config.headers.Authorization = `Bearer ${bangumiToken}`
    }
    const cachedUser = authStorage.getBangumiUser() || authStorage.getBangmioUser()
    if (cachedUser?.username) {
      config.headers['X-Bangumi-Username'] = cachedUser.username
    }
  }

  return config
})

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    const url = originalRequest.url || ''
    // 不对刷新请求本身重试
    if (url.includes('/auth/refresh')) {
      return Promise.reject(error)
    }

    const auth = getAuthStore()

    // Bangmio 用户：尝试刷新 JWT
    if (auth?.isBangmioUser && auth.bangmioToken && url.startsWith('/auth/')) {
      originalRequest._retry = true
      if (!isRefreshing) {
        isRefreshing = true
        try {
          // 直接用 axios 调用，避免再次触发拦截器
          const res = await axios.post(`${baseURL}/auth/refresh`, null, {
            timeout: 15000,
            headers: { Authorization: `Bearer ${auth.bangmioToken}` }
          })
          const newToken = res.data.data.token
          const newUser = res.data.data.user
          // 同步更新 store 与 localStorage
          auth.bangmioToken = newToken
          auth.bangmioUser = newUser
          authStorage.setBangmioToken(newToken)
          authStorage.setBangmioUser(newUser)
          onRefreshed(newToken)
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return api(originalRequest)
        } catch {
          onRefreshed(null)
          // 刷新失败：清空 Bangmio 认证并跳转登录
          auth.bangmioToken = ''
          auth.bangmioUser = null
          auth.bgmToken = ''
          authStorage.clearBangmio()
          if (router.currentRoute.value?.path !== '/login') {
            router.push('/login')
          }
          return Promise.reject(error)
        } finally {
          isRefreshing = false
        }
      } else {
        // 正在刷新，排队等待新 token
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
    }

    // Bangumi 直登用户：无 refresh 机制（token 长期有效，401 多为被吊销），
    // 携带 reason 跳登录页做友好提示而非静默清空
    if (auth?.isBangumiDirectUser) {
      auth.token = ''
      auth.user = null
      authStorage.clearBangumi()
      if (router.currentRoute.value?.path !== '/login') {
        router.push({ path: '/login', query: { reason: 'expired' } })
      }
    }

    return Promise.reject(error)
  }
)

export default api
