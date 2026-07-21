/**
 * JWT 认证中间件（Cloudflare Pages / Hono 后端）。
 *
 * 从请求头 `Authorization: Bearer <token>` 提取 JWT，使用 `env.JWT_SECRET`
 * 验证签名与过期时间。验证成功后将用户信息写入 `c.var.user`，供后续路由读取。
 *
 * 用法：
 *   import { jwtAuth } from '../middleware/jwtAuth.js'
 *   app.use('/api/v1/protected/*', jwtAuth())
 *   // 在路由中读取：
 *   const { userId, email, bgmUid } = c.get('user')
 */
import { verifyJwt } from '../utils/jwt.js'

/**
 * 创建 JWT 认证中间件。
 *
 * 中间件行为：
 * 1. 从 `Authorization` 头提取 `Bearer <token>`，缺失或格式错误返回 401。
 * 2. 调用 `verifyJwt` 验证签名与过期时间，失败返回 401。
 * 3. 验证通过则 `c.set('user', { userId, email, bgmUid })`，调用 `await next()`。
 *
 * @returns {(c: import('hono').Context, next: () => Promise<void>) => Promise<Response|void>}
 *   Hono 中间件函数。
 */
export function jwtAuth() {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization') || ''
    const match = authHeader.match(/^Bearer\s+(.+)$/i)
    if (!match) {
      return c.json({ data: null, error: '未登录', code: 401 }, 401)
    }
    const token = match[1]
    const secret = c.env?.JWT_SECRET
    const { valid, payload } = await verifyJwt(token, secret)
    if (!valid || !payload) {
      return c.json({ data: null, error: '未登录', code: 401 }, 401)
    }
    c.set('user', {
      userId: payload.userId,
      email: payload.email,
      bgmUid: payload.bgmUid || null
    })
    await next()
  }
}
