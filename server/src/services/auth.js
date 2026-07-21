/**
 * 用户认证服务（Cloudflare Pages / Hono 后端）。
 *
 * 提供：
 * - 用户注册 / 登录（邮箱 + 密码）
 * - Bangumi Access Token 绑定 / 解绑
 * - JWT 签发 / 刷新 / 当前用户查询
 *
 * 约定：
 * - 所有函数第一参为 D1 binding（`c.env.DB`），第二参为 env（需含 `JWT_SECRET`）。
 * - 业务错误统一通过 `httpError(status, message)` 抛出，路由层捕获后返回对应 HTTP 响应。
 *
 * 用法：
 *   import { registerUser, loginUser } from '../services/auth.js'
 *   const { token, user } = await registerUser(c.env.DB, c.env, { email, password })
 */
import {
  generateSalt,
  hashPassword,
  verifyPassword,
  encryptToken,
  decryptToken
} from '../utils/crypto.js'
import { signJwt, verifyJwt } from '../utils/jwt.js'
import {
  createUser,
  getUserByEmail,
  getUserById,
  updateUserBgmBinding,
  clearUserBgmBinding,
  getUserBgmBinding,
  userExistsByEmail
} from '../db/users.js'
import {
  generateNumericCode,
  createCode,
  getLatestCode,
  verifyCode,
  canResend,
  resendCooldownSeconds
} from '../db/emailCodes.js'
import { sendEmail, buildVerificationEmailHTML } from '../utils/email.js'
import { fetchHTML } from '../utils/http.js'
import { logError, logInfo } from '../utils/logger.js'

/** Bangumi `/v0/me` 接口地址，用于验证 Access Token 有效性 */
const BGM_ME_API = 'https://api.bgm.tv/v0/me'

/** OAuth 绑定流程 state JWT 有效期：5 分钟 */
const OAUTH_BIND_STATE_TTL = 5 * 60

/**
 * 构造一个带 `status` 属性的 Error，供路由层根据 status 决定响应码。
 * @param {number} status - HTTP 状态码。
 * @param {string} message - 错误信息。
 * @returns {Error} 带 status 与 message 的 Error 实例。
 */
function httpError(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

/**
 * 发送邮箱验证码（用于注册等场景）。
 *
 * 流程：
 * 1. 检查 1 分钟内是否已发送过（防滥用），未到冷却时间返回剩余秒数
 * 2. 生成 6 位数字验证码并写入 D1（10 分钟过期）
 * 3. 通过 Resend 发送验证码邮件
 *
 * @param {D1Database} db - D1 binding。
 * @param {object} env - 环境变量（需含 `RESEND_API_KEY`，可选 `RESEND_FROM`）。
 * @param {{ email: string, purpose?: string }} input - 邮箱与用途（默认 'register'）。
 * @returns {Promise<{ sent: true, cooldownSeconds: 0 }|{ sent: false, cooldownSeconds: number }>}
 *   发送结果，失败时返回剩余冷却秒数。
 * @throws {Error} 当邮件服务未配置或发送失败时抛出 httpError。
 */
export async function sendVerificationCode(db, env, { email, purpose = 'register' }) {
  const latest = await getLatestCode(db, email, purpose)
  if (!canResend(latest)) {
    return { sent: false, cooldownSeconds: resendCooldownSeconds(latest) }
  }
  if (!env.RESEND_API_KEY) {
    throw httpError(500, '邮件服务未配置（缺少 RESEND_API_KEY）')
  }
  const code = generateNumericCode()
  await createCode(db, { email, code, purpose })
  try {
    await sendEmail(
      { to: email, subject: '【Bangmio】注册验证码', html: buildVerificationEmailHTML(code) },
      env.RESEND_API_KEY,
      env.RESEND_FROM
    )
  } catch (err) {
    logError('验证码邮件发送失败', { email, error: String(err) })
    throw httpError(500, '验证码发送失败，请稍后重试')
  }
  logInfo('验证码已发送', { email, purpose })
  return { sent: true, cooldownSeconds: 0 }
}

/**
 * 注册新用户。
 *
 * 流程：
 * 1. 检查邮箱是否已注册，已存在则抛 `httpError(409, '邮箱已注册')`
 * 2. 校验邮箱验证码（必须为 'register' 用途且未消费未过期），失败抛 `httpError(400, '验证码错误或已过期')`
 * 3. 生成 salt 并计算 PBKDF2 密码哈希
 * 4. 生成 userId（`crypto.randomUUID()`），写入 D1
 * 5. 签发 JWT（含 userId、email）
 *
 * @param {D1Database} db - D1 binding（`c.env.DB`）。
 * @param {object} env - 环境变量（需含 `JWT_SECRET`）。
 * @param {{ email: string, password: string, code: string }} input - 注册信息（含验证码）。
 * @returns {Promise<{ token: string, user: { id: string, email: string, bgmUid: null } }>}
 *   JWT 与公开用户信息。
 * @throws {Error} 当邮箱已存在、验证码错误或入库失败时抛出 httpError。
 */
export async function registerUser(db, env, { email, password, code }) {
  const exists = await userExistsByEmail(db, email)
  if (exists) {
    throw httpError(409, '邮箱已注册')
  }
  if (!code) {
    throw httpError(400, '请输入邮箱验证码')
  }
  const codeOk = await verifyCode(db, email, String(code), 'register')
  if (!codeOk) {
    throw httpError(400, '验证码错误或已过期')
  }
  const salt = generateSalt()
  const passwordHash = await hashPassword(password, salt)
  const userId = crypto.randomUUID()
  const user = await createUser(db, { id: userId, email, passwordHash, salt })
  const token = await signJwt({ userId: user.id, email: user.email }, env.JWT_SECRET)
  logInfo('用户注册成功', { userId: user.id, email })
  return { token, user: { id: user.id, email: user.email, bgmUid: null } }
}

/**
 * 用户登录。
 *
 * 流程：
 * 1. 根据邮箱查询用户，不存在抛 `httpError(401, '邮箱或密码错误')`
 * 2. 验证密码，失败抛同样错误（避免泄露邮箱是否存在）
 * 3. 签发 JWT（含 userId、email、bgmUid）
 *
 * @param {D1Database} db - D1 binding（`c.env.DB`）。
 * @param {object} env - 环境变量（需含 `JWT_SECRET`）。
 * @param {{ email: string, password: string }} input - 登录信息。
 * @returns {Promise<{ token: string, user: { id: string, email: string, bgmUid: string|null } }>}
 *   JWT 与公开用户信息。
 * @throws {Error} 当邮箱不存在或密码错误时抛出 httpError(401)。
 */
export async function loginUser(db, env, { email, password }) {
  const user = await getUserByEmail(db, email)
  if (!user) {
    throw httpError(401, '邮箱或密码错误')
  }
  const ok = await verifyPassword(password, user.salt, user.passwordHash)
  if (!ok) {
    throw httpError(401, '邮箱或密码错误')
  }
  const token = await signJwt(
    { userId: user.id, email: user.email, bgmUid: user.bgmUid },
    env.JWT_SECRET
  )
  logInfo('用户登录成功', { userId: user.id, email })
  return { token, user: { id: user.id, email: user.email, bgmUid: user.bgmUid } }
}

/**
 * 绑定 Bangumi 账号。
 *
 * 流程：
 * 1. 调用 Bangumi `/v0/me` 验证 Access Token 有效性，失败抛 `httpError(401, 'Bangumi Token 无效')`
 * 2. 加密 Bangumi Token（AES-256-GCM，密钥由 `JWT_SECRET` 派生）
 * 3. 写入 D1（bgm_uid、bgm_token_encrypted、bgm_token_iv）
 * 4. 重新签发 JWT（含新的 bgmUid）
 *
 * @param {D1Database} db - D1 binding（`c.env.DB`）。
 * @param {object} env - 环境变量（需含 `JWT_SECRET`）。
 * @param {string} userId - 当前用户 ID。
 * @param {string} bangumiToken - Bangumi Access Token。
 * @returns {Promise<{ token: string, user: { id: string, email: string, bgmUid: string } }>}
 *   新 JWT 与公开用户信息。
 * @throws {Error} 当 Token 无效、用户不存在或更新失败时抛出。
 */
export async function bindBangumi(db, env, userId, bangumiToken) {
  let me
  try {
    const text = await fetchHTML(BGM_ME_API, {
      headers: {
        Authorization: 'Bearer ' + bangumiToken,
        Accept: 'application/json'
      }
    })
    me = JSON.parse(text)
  } catch (err) {
    logError('Bangumi token 验证失败', { userId, error: String(err) })
    throw httpError(401, 'Bangumi Token 无效')
  }
  const bgmUid = me?.id
  if (!bgmUid) {
    throw httpError(401, 'Bangumi Token 无效')
  }
  const { encrypted, iv } = await encryptToken(bangumiToken, env.JWT_SECRET)
  const updated = await updateUserBgmBinding(db, userId, String(bgmUid), encrypted, iv)
  if (!updated) {
    throw httpError(404, '用户不存在')
  }
  const token = await signJwt(
    { userId: updated.id, email: updated.email, bgmUid: updated.bgmUid },
    env.JWT_SECRET
  )
  logInfo('Bangumi 绑定成功', { userId, bgmUid: String(bgmUid) })
  return {
    token,
    user: { id: updated.id, email: updated.email, bgmUid: updated.bgmUid }
  }
}

/**
 * 解绑 Bangumi 账号。
 *
 * 清除 D1 中的 bgm_uid、bgm_token_encrypted、bgm_token_iv 字段。
 *
 * @param {D1Database} db - D1 binding（`c.env.DB`）。
 * @param {object} env - 环境变量（保留参数，便于未来扩展）。
 * @param {string} userId - 当前用户 ID。
 * @returns {Promise<{ success: true }>} 操作结果。
 * @throws {Error} 当 D1 更新失败时抛出。
 */
export async function unbindBangumi(db, env, userId) {
  await clearUserBgmBinding(db, userId)
  logInfo('Bangumi 解绑成功', { userId })
  return { success: true }
}

/**
 * 刷新 JWT。
 *
 * 验证旧 token 有效性后，从 payload 取 userId 查询最新用户信息，
 * 重新签发 JWT（含最新的 bgmUid）。
 *
 * @param {D1Database} db - D1 binding（`c.env.DB`）。
 * @param {object} env - 环境变量（需含 `JWT_SECRET`）。
 * @param {string} oldToken - 旧 JWT 字符串。
 * @returns {Promise<{ token: string, user: { id: string, email: string, bgmUid: string|null } }>}
 *   新 JWT 与公开用户信息。
 * @throws {Error} 当 token 无效或用户不存在时抛出。
 */
export async function refreshJwt(db, env, oldToken) {
  const { valid, payload } = await verifyJwt(oldToken, env.JWT_SECRET)
  if (!valid || !payload) {
    throw httpError(401, 'Token 无效或已过期')
  }
  const userId = payload.userId
  if (!userId) {
    throw httpError(401, 'Token 无效或已过期')
  }
  const user = await getUserById(db, userId)
  if (!user) {
    throw httpError(404, '用户不存在')
  }
  const token = await signJwt(
    { userId: user.id, email: user.email, bgmUid: user.bgmUid },
    env.JWT_SECRET
  )
  return {
    token,
    user: { id: user.id, email: user.email, bgmUid: user.bgmUid }
  }
}

/**
 * 获取当前用户信息。
 *
 * @param {D1Database} db - D1 binding（`c.env.DB`）。
 * @param {object} env - 环境变量（保留参数，便于未来扩展）。
 * @param {string} userId - 当前用户 ID。
 * @returns {Promise<{ user: { id: string, email: string, bgmUid: string|null, isBound: boolean } }>}
 *   公开用户信息（含 `isBound` 标记是否已绑定 Bangumi）。
 * @throws {Error} 当用户不存在时抛出 httpError(404)。
 */
export async function getCurrentUser(db, env, userId) {
  const user = await getUserById(db, userId)
  if (!user) {
    throw httpError(404, '用户不存在')
  }
  return {
    user: {
      id: user.id,
      email: user.email,
      bgmUid: user.bgmUid,
      isBound: !!user.bgmUid
    }
  }
}

/**
 * 获取用户的明文 Bangumi Access Token。
 *
 * 从 D1 读取加密 token 与 IV，使用 `JWT_SECRET` 派生密钥后 AES-GCM 解密。
 * 未绑定或解密失败时返回 null。
 *
 * @param {D1Database} db - D1 binding（`c.env.DB`）。
 * @param {object} env - 环境变量（需含 `JWT_SECRET`）。
 * @param {string} userId - 当前用户 ID。
 * @returns {Promise<string|null>} 明文 Bangumi Access Token，未绑定或解密失败返回 null。
 */
export async function getUserBgmToken(db, env, userId) {
  const binding = await getUserBgmBinding(db, userId)
  if (!binding || !binding.bgmTokenEncrypted || !binding.bgmTokenIv) {
    return null
  }
  try {
    return await decryptToken(binding.bgmTokenEncrypted, binding.bgmTokenIv, env.JWT_SECRET)
  } catch (err) {
    logError('Bangumi token 解密失败', { userId, error: String(err) })
    return null
  }
}

/**
 * 生成 OAuth 绑定流程的 state JWT。
 *
 * state 中包含当前 Bangmio 用户 ID 与 action='bind' 标记，
 * 用于在 OAuth 回调时识别这是绑定流程而非登录流程，并定位到具体用户。
 * 有效期 5 分钟。
 *
 * @param {object} env - 环境变量（需含 `JWT_SECRET`）。
 * @param {string} userId - 当前 Bangmio 用户 ID。
 * @returns {Promise<string>} state JWT 字符串。
 */
export async function createOAuthBindState(env, userId) {
  return signJwt({ userId, action: 'bind' }, env.JWT_SECRET, OAUTH_BIND_STATE_TTL)
}

/**
 * 验证 OAuth 绑定流程的 state JWT 并返回 userId。
 *
 * @param {object} env - 环境变量（需含 `JWT_SECRET`）。
 * @param {string} state - 待验证的 state JWT。
 * @returns {Promise<{ valid: boolean, userId?: string }>}
 */
export async function verifyOAuthBindState(env, state) {
  const { valid, payload } = await verifyJwt(state, env.JWT_SECRET)
  if (!valid || !payload || payload.action !== 'bind' || !payload.userId) {
    return { valid: false }
  }
  return { valid: true, userId: payload.userId }
}

/**
 * 通过 Bangumi OAuth 授权码绑定账号。
 *
 * 流程：
 * 1. 验证 state JWT，提取 userId（必须是绑定流程）
 * 2. 用授权码向 Bangumi 换取 access_token
 * 3. 调用 /v0/me 获取 Bangumi 用户信息
 * 4. 加密 access_token 并写入 D1
 * 5. 签发新的 Bangmio JWT（含 bgmUid）
 *
 * @param {D1Database} db - D1 binding。
 * @param {object} env - 环境变量。
 * @param {{ code: string, state: string, oauthBase: string, appId: string, appSecret: string, redirectUri: string }} input
 *   OAuth 参数。
 * @returns {Promise<{ token: string, user: object }>}
 *   新 JWT 与用户信息。
 * @throws {Error} 当 state 无效、授权码换取失败或写入失败时抛出 httpError。
 */
export async function bindBangumiByOAuth(
  db,
  env,
  { code, state, oauthBase, appId, appSecret, redirectUri }
) {
  const stateResult = await verifyOAuthBindState(env, state)
  if (!stateResult.valid || !stateResult.userId) {
    throw httpError(400, '授权状态无效或已过期，请重新发起绑定')
  }
  const userId = stateResult.userId

  // 用授权码换取 access_token
  let accessToken
  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: appId,
      client_secret: appSecret,
      code,
      redirect_uri: redirectUri
    })
    const tokenRes = await fetch(`${oauthBase}/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    })
    const tokenData = await tokenRes.json()
    accessToken = tokenData.access_token
  } catch (err) {
    logError('OAuth 授权码换取失败', { userId, error: String(err) })
    throw httpError(400, '授权码无效或已过期')
  }
  if (!accessToken) {
    throw httpError(400, '获取 Bangumi Access Token 失败')
  }

  // 验证 token 并获取 Bangumi 用户信息
  let me
  try {
    const text = await fetchHTML(BGM_ME_API, {
      headers: { Authorization: 'Bearer ' + accessToken, Accept: 'application/json' }
    })
    me = JSON.parse(text)
  } catch (err) {
    logError('OAuth 绑定时验证 token 失败', { userId, error: String(err) })
    throw httpError(500, 'Bangumi Token 验证失败')
  }
  const bgmUid = me?.id
  if (!bgmUid) {
    throw httpError(500, '获取 Bangumi 用户信息失败')
  }

  const { encrypted, iv } = await encryptToken(accessToken, env.JWT_SECRET)
  const updated = await updateUserBgmBinding(db, userId, String(bgmUid), encrypted, iv)
  if (!updated) {
    throw httpError(404, '用户不存在')
  }
  const token = await signJwt(
    { userId: updated.id, email: updated.email, bgmUid: updated.bgmUid },
    env.JWT_SECRET
  )
  logInfo('OAuth 绑定成功', { userId, bgmUid: String(bgmUid) })
  return {
    token,
    user: { id: updated.id, email: updated.email, bgmUid: updated.bgmUid },
    bgmToken: accessToken
  }
}
