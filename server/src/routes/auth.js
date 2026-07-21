/**
 * 认证路由（Cloudflare Pages / Hono 后端）。
 *
 * 挂载于 `/api/v1/auth`，提供注册、登录、刷新、Bangumi 绑定/解绑、当前用户查询。
 *
 * 响应格式统一为 `{ data, error, code }`：
 * - 成功：`{ data: {...}, code: 200 }`
 * - 失败：`{ data: null, error: '错误信息', code: 状态码 }`
 *
 * 错误处理：
 * - 业务错误（httpError）：返回对应 status 与 message
 * - 其他错误：返回 500 '服务器内部错误'
 */
import { Hono } from 'hono'
import { jwtAuth } from '../middleware/jwtAuth.js'
import {
  registerUser,
  loginUser,
  bindBangumi,
  unbindBangumi,
  refreshJwt,
  getCurrentUser
} from '../services/auth.js'

const app = new Hono()

/**
 * D1 可用性检查中间件
 * 当 D1 binding 未配置时，所有写操作路由返回 503 引导用户使用 Bangumi 直登
 */
app.use('*', async (c, next) => {
  if (!c.env?.DB && c.req.method === 'POST') {
    return c.json(
      {
        data: null,
        error: '账号系统暂未开放（D1 数据库未配置），请使用 Bangumi 直登',
        code: 503
      },
      503
    )
  }
  await next()
})

/** 简单邮箱正则：包含 @ 与域名点 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * 判断错误是否为业务 httpError（带 status 属性）。
 * @param {unknown} err - 捕获的错误。
 * @returns {err is Error & { status: number }}
 */
function isHttpError(err) {
  return err instanceof Error && typeof err.status === 'number'
}

/**
 * 统一错误响应：httpError 返回对应 status，其他返回 500。
 * @param {unknown} err - 捕获的错误。
 * @returns {Response} Hono JSON 响应。
 */
function errorResponse(err) {
  if (isHttpError(err)) {
    return Response.json(
      { data: null, error: err.message, code: err.status },
      { status: err.status }
    )
  }
  return Response.json({ data: null, error: '服务器内部错误', code: 500 }, { status: 500 })
}

/**
 * POST /register
 * Body: { email, password }
 * 注册新用户并签发 JWT。
 */
app.post('/register', async c => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const { email, password } = body || {}
    if (!email || !EMAIL_REGEX.test(String(email))) {
      return c.json({ data: null, error: '邮箱格式不正确', code: 400 }, 400)
    }
    if (!password || String(password).length < 8) {
      return c.json({ data: null, error: '密码至少 8 位', code: 400 }, 400)
    }
    const result = await registerUser(c.env.DB, c.env, { email, password })
    return c.json({ data: { token: result.token, user: result.user }, code: 200 })
  } catch (err) {
    return errorResponse(err)
  }
})

/**
 * POST /login
 * Body: { email, password }
 * 验证邮箱密码并签发 JWT。
 */
app.post('/login', async c => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const { email, password } = body || {}
    if (!email || !password) {
      return c.json({ data: null, error: '邮箱或密码不能为空', code: 400 }, 400)
    }
    const result = await loginUser(c.env.DB, c.env, { email, password })
    return c.json({ data: { token: result.token, user: result.user }, code: 200 })
  } catch (err) {
    return errorResponse(err)
  }
})

/**
 * POST /refresh
 * Header: Authorization: Bearer <token>
 * 验证旧 token 并签发新 JWT。
 */
app.post('/refresh', async c => {
  try {
    const authHeader = c.req.header('Authorization') || ''
    const match = authHeader.match(/^Bearer\s+(.+)$/i)
    if (!match) {
      return c.json({ data: null, error: '未登录', code: 401 }, 401)
    }
    const result = await refreshJwt(c.env.DB, c.env, match[1])
    return c.json({ data: { token: result.token, user: result.user }, code: 200 })
  } catch (err) {
    return errorResponse(err)
  }
})

/**
 * POST /bind-bangumi
 * Header: Authorization: Bearer <jwt>
 * Body: { bangumiToken }
 * 验证 Bangumi Token 并绑定到当前用户。
 */
app.post('/bind-bangumi', jwtAuth(), async c => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const { bangumiToken } = body || {}
    if (!bangumiToken) {
      return c.json({ data: null, error: 'Bangumi Token 不能为空', code: 400 }, 400)
    }
    const currentUser = c.get('user')
    const result = await bindBangumi(c.env.DB, c.env, currentUser.userId, bangumiToken)
    return c.json({ data: { token: result.token, user: result.user }, code: 200 })
  } catch (err) {
    return errorResponse(err)
  }
})

/**
 * DELETE /bind-bangumi
 * Header: Authorization: Bearer <jwt>
 * 解绑当前用户的 Bangumi 账号。
 */
app.delete('/bind-bangumi', jwtAuth(), async c => {
  try {
    const currentUser = c.get('user')
    const result = await unbindBangumi(c.env.DB, c.env, currentUser.userId)
    return c.json({ data: { success: result.success }, code: 200 })
  } catch (err) {
    return errorResponse(err)
  }
})

/**
 * GET /me
 * Header: Authorization: Bearer <jwt>
 * 查询当前用户信息（含 Bangumi 绑定状态）。
 */
app.get('/me', jwtAuth(), async c => {
  try {
    const currentUser = c.get('user')
    const result = await getCurrentUser(c.env.DB, c.env, currentUser.userId)
    return c.json({ data: { user: result.user }, code: 200 })
  } catch (err) {
    return errorResponse(err)
  }
})

export default app
