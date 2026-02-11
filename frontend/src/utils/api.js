import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 10000,
})

// Request interceptor
api.interceptors.request.use(
  config => {
    // Add any auth headers here if needed
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  response => response.data,
  error => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

export const searchAnime = (query, type = 2) => {
  return api.get('/search', { params: { q: query, type } })
}

export const getAnimeDetail = (id) => {
  return api.get(`/anime/${id}`)
}

export const getSubjectDetail = (id) => {
  return api.get(`/subject/${id}`)
}

export const healthCheck = () => {
  return api.get('/health')
}

export default api