/**
 * 邮箱验证码数据访问层（Cloudflare D1）。
 *
 * 表结构见 `server/db/schema.sql` 的 `email_codes` 表：
 *   email_codes(id, email, code, purpose, expires_at, consumed, created_at)
 *
 * 约定：
 * - 6 位数字验证码，10 分钟过期
 * - 同一邮箱+purpose 1 分钟内仅允许 1 条（应用层在插入前查询最新一条的时间戳）
 * - 验证成功后置 consumed=1，不可重用
 * - 过期未使用的记录由后台清理（这里只提供查询与插入，不做自动清理）
 */

/** 验证码有效期（毫秒）：10 分钟 */
const CODE_TTL_MS = 10 * 60 * 1000

/** 同一邮箱+purpose 发送间隔（毫秒）：60 秒 */
const CODE_RESEND_INTERVAL_MS = 60 * 1000

/**
 * 生成 6 位数字验证码（前缀 0 保留）。
 * 使用 `crypto.getRandomValues` 保证密码学安全。
 * @returns {string} 6 位数字字符串。
 */
export function generateNumericCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += String(bytes[i] % 10)
  }
  return code
}

/**
 * 查询指定邮箱+purpose 的最新一条验证码记录。
 * 用于：1) 1 分钟发送间隔检查 2) 验证用户输入
 *
 * @param {D1Database} db - D1 binding。
 * @param {string} email - 邮箱。
 * @param {string} purpose - 用途（如 'register'）。
 * @returns {Promise<{ id: string, code: string, expiresAt: number, consumed: number, createdAt: number }|null>}
 *   最新记录或 null。
 */
export async function getLatestCode(db, email, purpose) {
  try {
    const row = await db
      .prepare(
        `SELECT id, code, expires_at AS expiresAt, consumed, created_at AS createdAt
           FROM email_codes
          WHERE email = ? AND purpose = ?
          ORDER BY created_at DESC
          LIMIT 1`
      )
      .bind(email, purpose)
      .first()
    return row || null
  } catch {
    return null
  }
}

/**
 * 插入新的验证码记录。
 *
 * @param {D1Database} db - D1 binding。
 * @param {{ email: string, code: string, purpose: string }} input - 验证码信息。
 * @returns {Promise<{ id: string, expiresAt: number }>} 新记录的 id 与过期时间戳。
 * @throws {Error} 当 D1 写入失败时抛出。
 */
export async function createCode(db, { email, code, purpose }) {
  const id = crypto.randomUUID()
  const now = Date.now()
  const expiresAt = now + CODE_TTL_MS
  try {
    const result = await db
      .prepare(
        `INSERT INTO email_codes (id, email, code, purpose, expires_at, consumed, created_at)
         VALUES (?, ?, ?, ?, ?, 0, ?)`
      )
      .bind(id, email, code, purpose, expiresAt, now)
      .run()
    if (!result.success) throw new Error('D1 run() 返回 success=false')
  } catch (err) {
    throw new Error(`createCode: 写入失败 (email=${email}, purpose=${purpose})`, { cause: err })
  }
  return { id, expiresAt }
}

/**
 * 校验用户输入的验证码是否正确。
 *
 * 校验逻辑：
 * 1. 查询最新一条同 email+purpose 记录
 * 2. 记录不存在 → false
 * 3. 已消费 → false
 * 4. 已过期 → false
 * 5. code 不匹配 → false
 * 6. 通过 → 标记 consumed=1 并返回 true
 *
 * @param {D1Database} db - D1 binding。
 * @param {string} email - 邮箱。
 * @param {string} code - 用户输入的验证码。
 * @param {string} purpose - 用途。
 * @returns {Promise<boolean>} 验证是否通过。
 */
export async function verifyCode(db, email, code, purpose) {
  const record = await getLatestCode(db, email, purpose)
  if (!record) return false
  if (record.consumed) return false
  if (Date.now() > record.expiresAt) return false
  // 常量时间比较，防止时序攻击
  if (record.code.length !== code.length) return false
  let diff = 0
  for (let i = 0; i < code.length; i++) {
    diff |= record.code.charCodeAt(i) ^ code.charCodeAt(i)
  }
  if (diff !== 0) return false
  // 标记已消费
  try {
    await db.prepare('UPDATE email_codes SET consumed = 1 WHERE id = ?').bind(record.id).run()
  } catch {
    // 标记失败不影响验证结果（已通过校验）
  }
  return true
}

/**
 * 判断是否允许发送新验证码（距上次发送是否已超过 60 秒）。
 * @param {{ createdAt: number }|null} latest - 最近一条记录。
 * @returns {boolean} 允许发送返回 true。
 */
export function canResend(latest) {
  if (!latest) return true
  return Date.now() - latest.createdAt >= CODE_RESEND_INTERVAL_MS
}

/**
 * 计算下次允许发送的剩余秒数（用于前端倒计时显示）。
 * @param {{ createdAt: number }|null} latest - 最近一条记录。
 * @returns {number} 剩余秒数，0 表示可立即发送。
 */
export function resendCooldownSeconds(latest) {
  if (!latest) return 0
  const elapsed = Date.now() - latest.createdAt
  if (elapsed >= CODE_RESEND_INTERVAL_MS) return 0
  return Math.ceil((CODE_RESEND_INTERVAL_MS - elapsed) / 1000)
}
