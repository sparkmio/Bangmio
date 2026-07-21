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
  getCurrentUser,
  sendVerificationCode,
  getUserBgmToken,
  createOAuthBindState,
  bindBangumiByOAuth
} from '../services/auth.js'
import { verifyTurnstile } from '../utils/turnstile.js'

const app = new Hono()

/** Bangumi OAuth 应用默认配置（与 routes/user.js 保持一致，可通过环境变量覆盖） */
const DEFAULT_BGM_APP_ID = 'bgm61416a088eff71580'
const DEFAULT_BGM_APP_SECRET = '6b8055c0159fcc5e998059536813026f'

/**
 * 判断请求是否来自国内节点（决定走 bgm.tv 还是 bangumi.lol 镜像）。
 * @param {import('hono').Context} c
 * @returns {boolean}
 */
function isChina(c) {
  return (c.env?.CF_IP_COUNTRY || '') === 'CN'
}

/**
 * 获取 OAuth 基础 URL（国内走镜像，海外走官方）。
 * @param {import('hono').Context} c
 * @returns {string}
 */
function oauthBase(c) {
  return isChina(c) ? 'https://bangumi.lol' : 'https://bgm.tv'
}

/**
 * 获取 OAuth 回调地址（生产环境从环境变量读取，开发环境回退到 localhost）。
 * @param {import('hono').Context} c
 * @returns {string}
 */
function redirectUri(c) {
  return c.env?.OAUTH_REDIRECT_URI || 'http://localhost:5173/login/callback'
}

/**
 * 运行时依赖检查中间件
 * - D1 binding 未配置：所有 POST 返回 503（账号写入不可用）
 * - JWT_SECRET 未配置：所有 POST 返回 503（无法签发 JWT）
 * 引导用户使用 Bangumi 直登
 */
app.use('*', async (c, next) => {
  if (c.req.method === 'POST' && (!c.env?.DB || !c.env?.JWT_SECRET)) {
    const missing = []
    if (!c.env?.DB) missing.push('D1 数据库')
    if (!c.env?.JWT_SECRET) missing.push('JWT_SECRET 环境变量')
    return c.json(
      {
        data: null,
        error: `账号系统暂未开放（缺少 ${missing.join('、')}），请使用 Bangumi 直登`,
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
 * POST /send-code
 * Body: { email, captchaToken, purpose? }
 * 发送邮箱验证码（用于注册）。
 *
 * - 若配置了 Turnstile secret：校验 captchaToken
 * - 1 分钟内仅允许发送一次，返回剩余冷却秒数
 * - 需配置 RESEND_API_KEY 才能发送
 */
app.post('/send-code', async c => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const { email, captchaToken, purpose = 'register' } = body || {}
    if (!email || !EMAIL_REGEX.test(String(email))) {
      return c.json({ data: null, error: '邮箱格式不正确', code: 400 }, 400)
    }
    // Turnstile 校验（未配置 secret 时跳过）
    const turnstile = await verifyTurnstile(
      captchaToken,
      c.env?.TURNSTILE_SECRET_KEY,
      c.req.header('CF-Connecting-IP')
    )
    if (!turnstile.success) {
      return c.json({ data: null, error: '人机验证失败，请重试', code: 400 }, 400)
    }
    const result = await sendVerificationCode(c.env.DB, c.env, { email, purpose })
    return c.json({ data: result, code: 200 })
  } catch (err) {
    return errorResponse(err)
  }
})

/**
 * POST /register
 * Body: { email, password, code, captchaToken? }
 * 注册新用户并签发 JWT。
 *
 * - 必须提供有效的邮箱验证码（code）
 * - 若配置了 Turnstile secret：必须提供有效的 captchaToken
 */
app.post('/register', async c => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const { email, password, code, captchaToken } = body || {}
    if (!email || !EMAIL_REGEX.test(String(email))) {
      return c.json({ data: null, error: '邮箱格式不正确', code: 400 }, 400)
    }
    if (!password || String(password).length < 8) {
      return c.json({ data: null, error: '密码至少 8 位', code: 400 }, 400)
    }
    // 若配置了 Turnstile secret，强制要求人机验证
    if (c.env?.TURNSTILE_SECRET_KEY) {
      const turnstile = await verifyTurnstile(
        captchaToken,
        c.env.TURNSTILE_SECRET_KEY,
        c.req.header('CF-Connecting-IP')
      )
      if (!turnstile.success) {
        return c.json({ data: null, error: '人机验证失败，请重试', code: 400 }, 400)
      }
    }
    const result = await registerUser(c.env.DB, c.env, { email, password, code })
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

/**
 * GET /bgm-token
 * Header: Authorization: Bearer <jwt>
 *
 * 返回当前用户解密后的 Bangumi Access Token。
 *
 * 用于：Bangmio 用户登录后前端获取 bgm token 以访问 Bangumi 相关 API
 * （如收藏、评论）。token 在 D1 中以 AES-GCM 加密存储，本接口解密后返回明文。
 *
 * 未绑定 Bangumi 时返回 404。
 */
app.get('/bgm-token', jwtAuth(), async c => {
  try {
    const currentUser = c.get('user')
    const bgmToken = await getUserBgmToken(c.env.DB, c.env, currentUser.userId)
    if (!bgmToken) {
      return c.json({ data: null, error: '未绑定 Bangumi 账号', code: 404 }, 404)
    }
    return c.json({ data: { bgmToken }, code: 200 })
  } catch (err) {
    return errorResponse(err)
  }
})

/**
 * GET /oauth-bind-url
 * Header: Authorization: Bearer <jwt>
 *
 * 生成 OAuth 绑定流程的授权 URL（含 state JWT）。
 * 前端跳转到此 URL，用户在 Bangumi 授权后回调到 /login/callback?code=xxx&state=xxx。
 */
app.get('/oauth-bind-url', jwtAuth(), async c => {
  try {
    const currentUser = c.get('user')
    const state = await createOAuthBindState(c.env, currentUser.userId)
    const appId = c.env?.BGM_APP_ID || DEFAULT_BGM_APP_ID
    const url = `${oauthBase(c)}/oauth/authorize?client_id=${appId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri(c))}&state=${encodeURIComponent(state)}`
    return c.json({ data: { url }, code: 200 })
  } catch (err) {
    return errorResponse(err)
  }
})

/**
 * POST /oauth-bind-callback
 * Header: Authorization: Bearer <jwt>
 * Body: { code, state }
 *
 * 使用 OAuth 授权码完成 Bangumi 绑定。
 * state 必须是 /oauth-bind-url 签发的 JWT，包含 userId 与 action='bind'。
 */
app.post('/oauth-bind-callback', jwtAuth(), async c => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const { code, state } = body || {}
    if (!code || !state) {
      return c.json({ data: null, error: '缺少授权码或 state', code: 400 }, 400)
    }
    const appId = c.env?.BGM_APP_ID || DEFAULT_BGM_APP_ID
    const appSecret = c.env?.BGM_APP_SECRET || DEFAULT_BGM_APP_SECRET
    const result = await bindBangumiByOAuth(c.env.DB, c.env, {
      code,
      state,
      oauthBase: oauthBase(c),
      appId,
      appSecret,
      redirectUri: redirectUri(c)
    })
    return c.json({
      data: { token: result.token, user: result.user, bgmToken: result.bgmToken },
      code: 200
    })
  } catch (err) {
    return errorResponse(err)
  }
})

export default app
