import axios from 'axios'
import { ElMessage } from 'element-plus'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 10000,
})

// 请求拦截器：添加token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('bangmio_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器：处理401错误
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('bangmio_token')
      localStorage.removeItem('bangmio_user')
      window.location.reload()
    }
    return Promise.reject(error)
  }
)

// Bangumi OAuth 登录
export const loginWithBangumi = async () => {
  try {
    const response = await api.get('/auth/bangumi/authorize')
    return response.url
  } catch (error) {
    console.error('Failed to get auth URL:', error)
    throw new Error('获取登录链接失败')
  }
}

// 处理OAuth回调
export const handleOAuthCallback = async (code) => {
  try {
    const response = await api.post('/auth/bangumi/callback', { code })
    const { token, user } = response
    
    localStorage.setItem('bangmio_token', token)
    localStorage.setItem('bangmio_user', JSON.stringify(user))
    
    ElMessage.success('登录成功！')
    return user
  } catch (error) {
    console.error('OAuth callback failed:', error)
    ElMessage.error('登录失败：' + (error.response?.data?.message || error.message))
    throw error
  }
}

// 获取用户信息
export const getUserInfo = async () => {
  try {
    // 先检查本地存储
    const storedUser = localStorage.getItem('bangmio_user')
    if (storedUser) {
      return JSON.parse(storedUser)
    }

    // 从服务器获取
    const response = await api.get('/auth/me')
    const user = response.user
    
    localStorage.setItem('bangmio_user', JSON.stringify(user))
    return user
  } catch (error) {
    console.error('Failed to get user info:', error)
    localStorage.removeItem('bangmio_user')
    throw error
  }
}

// 登出
export const logoutUser = async () => {
  try {
    await api.post('/auth/logout')
  } catch (error) {
    console.error('Logout failed:', error)
  } finally {
    localStorage.removeItem('bangmio_token')
    localStorage.removeItem('bangmio_user')
  }
}

// 检查登录状态
export const checkAuth = () => {
  return !!localStorage.getItem('bangmio_token')
}

// 获取当前token
export const getToken = () => {
  return localStorage.getItem('bangmio_token')
}

export default api