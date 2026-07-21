/**
 * Cloudflare Turnstile 人机验证工具。
 *
 * 在前端嵌入 Turnstile widget（`https://challenges.cloudflare.com/turnstile/v0/api.js`），
 * 用户完成后获得 token；后端通过 siteverify 接口验证 token 有效性。
 *
 * 需要 `TURNSTILE_SECRET_KEY` 环境变量；若未配置则跳过验证（开发环境友好）。
 * 生产环境应在 Cloudflare Dashboard 创建 Turnstile widget 并配置两个变量：
 *   - `TURNSTILE_SITE_KEY`（公开，前端使用）
 *   - `TURNSTILE_SECRET_KEY`（私密，后端使用）
 *
 * 用法：
 *   import { verifyTurnstile } from '../utils/turnstile.js'
 *   const result = await verifyTurnstile(token, env.TURNSTILE_SECRET_KEY, c.req.header('CF-Connecting-IP'))
 *   if (!result.success) return c.json({ error: '人机验证失败' }, 400)
 */

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/**
 * 验证 Turnstile token。
 *
 * 当 `secret` 未配置时返回 `{ success: true, skipped: true }`，方便本地开发。
 *
 * @param {string} token - 前端 Turnstile widget 返回的 token。
 * @param {string} secret - Turnstile secret key。
 * @param {string} [remoteip] - 用户 IP（可选，用于风控）。
 * @returns {Promise<{ success: boolean, skipped?: boolean, errorCodes?: string[] }>}
 *   验证结果对象。`skipped` 为 true 表示因未配置 secret 而跳过。
 */
export async function verifyTurnstile(token, secret, remoteip) {
  // 未配置 secret：跳过验证（开发环境）
  if (!secret) {
    return { success: true, skipped: true }
  }
  if (!token) {
    return { success: false, errorCodes: ['missing-input-response'] }
  }

  const body = new URLSearchParams({
    secret,
    response: token
  })
  if (remoteip) body.append('remoteip', remoteip)

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body
    })
    const data = await res.json()
    return {
      success: !!data.success,
      errorCodes: data['error-codes'] || []
    }
  } catch (err) {
    return { success: false, errorCodes: ['verify-error'], message: String(err) }
  }
}
