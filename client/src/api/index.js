import axios from 'axios'

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
  } catch {
    // ignore
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
            const res = await axios.post(
              `${baseURL}/user/refresh-token`,
              { refreshToken },
              { timeout: 15000 }
            )
            const newToken = res.data.data.token
            localStorage.setItem('bangmio_token', newToken)
            if (res.data.data.refreshToken) {
              localStorage.setItem('bangmio_refresh_token', res.data.data.refreshToken)
            }
            localStorage.setItem('bangmio_user', JSON.stringify(res.data.data.user))
            onRefreshed(newToken)
            originalRequest.headers.Authorization = `Bearer ${newToken}`
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
