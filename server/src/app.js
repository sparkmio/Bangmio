/**
 * Bangmio 服务端应用入口
 * 注册所有 API 路由，提供全局错误兜底和 404 处理
 */
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logError } from './utils/logger.js'
import { rateLimit } from './utils/rateLimit.js'
import { securityHeaders } from './middleware/security.js'
import { RATE_LIMIT_WINDOW, RATE_LIMIT_MAX_POST, RATE_LIMIT_MAX_GET } from './config.js'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/user.js'
import animeRoutes from './routes/anime.js'
import collectionRoutes from './routes/collection.js'
import commentsRoutes from './routes/comments.js'
import doubanRoutes from './routes/douban.js'
import bilibiliRoutes from './routes/bilibili.js'
import moegirlRoutes from './routes/moegirl.js'
import groupRoutes from './routes/groups.js'

const app = new Hono()

app.use('*', cors())

app.use('*', async (c, next) => {
  const country = c.req.header('cf-ipcountry') || ''
  c.env = c.env || {}
  c.env.CF_IP_COUNTRY = country
  await next()
})

// 安全响应头：为所有响应添加安全相关 HTTP 头
app.use('*', securityHeaders())

// 速率限制：POST/PUT/DELETE 路由 10 次/分钟，GET 路由 60 次/分钟
// 注意：limiter 实例必须在模块级创建一次，确保 store(Map) 在请求间累积计数
const postLimiter = rateLimit(RATE_LIMIT_WINDOW, RATE_LIMIT_MAX_POST)
const getLimiter = rateLimit(RATE_LIMIT_WINDOW, RATE_LIMIT_MAX_GET)
app.use('/api/v1/*', async (c, next) => {
  const method = c.req.method.toUpperCase()
  const limiter =
    method === 'POST' || method === 'PUT' || method === 'DELETE' ? postLimiter : getLimiter
  return limiter(c, next)
})

// 认证路由速率限制：register/login 5 次/分钟（比通用 POST 限制更严格，防止暴力破解）
const authLimiter = rateLimit(RATE_LIMIT_WINDOW, 5)
app.use('/api/v1/auth/*', async (c, next) => {
  const path = c.req.path
  const method = c.req.method.toUpperCase()
  if (method === 'POST' && (path === '/api/v1/auth/register' || path === '/api/v1/auth/login')) {
    return authLimiter(c, next)
  }
  await next()
})

app.route('/api/v1/auth', authRoutes)
app.route('/api/v1/user', userRoutes)
app.route('/api/v1/anime', animeRoutes)
app.route('/api/v1/collection', collectionRoutes)
app.route('/api/v1/comments', commentsRoutes)
app.route('/api/v1/douban', doubanRoutes)
app.route('/api/v1/bilibili', bilibiliRoutes)
app.route('/api/v1/moegirl', moegirlRoutes)
app.route('/api/v1/groups', groupRoutes)

app.get('/api/health', c => c.json({ status: 'ok', country: c.env?.CF_IP_COUNTRY || 'unknown' }))

// 404 兜底路由
app.all('*', c => {
  return c.json({ data: null, error: 'Not Found', code: 404 }, 404)
})

// 全局错误兜底中间件
app.onError((err, c) => {
  logError('未捕获的服务器异常', {
    message: err?.message || String(err),
    stack: err?.stack,
    path: c.req.path,
    method: c.req.method
  })
  return c.json({ data: null, error: '服务器内部错误', code: 500 }, 500)
})

export default app
