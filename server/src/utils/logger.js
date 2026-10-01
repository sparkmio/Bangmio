/**
 * 统一日志工具（Cloudflare Pages / Hono 后端）。
 *
 * 输出结构化 JSON 日志到 console，CF Workers 会自动收集 console 输出。
 * 日志格式：{ level, msg, meta, timestamp }
 */

function maskEmail(value) {
  const email = String(value || '')
  const at = email.indexOf('@')
  if (at <= 1) return '[REDACTED_EMAIL]'
  return email[0] + '***' + email.slice(at - 1)
}

function sanitizeMeta(value, key = '') {
  const normalizedKey = key.toLowerCase()
  if (/token|secret|password|passwd|authorization|cookie|set-cookie|code/.test(normalizedKey)) {
    return '[REDACTED]'
  }
  if (normalizedKey === 'email') return maskEmail(value)
  if (Array.isArray(value)) return value.map(item => sanitizeMeta(item))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        sanitizeMeta(childValue, childKey)
      ])
    )
  }
  return value
}

/**
 * 内部：输出一条结构化日志。
 * @param {'info'|'error'|'warn'} level - 日志级别。
 * @param {string} msg - 人类可读的日志消息。
 * @param {Record<string, any>} meta - 附加的结构化元数据。
 * @returns {void}
 */
function emit(level, msg, meta) {
  const payload = {
    level,
    msg,
    meta: sanitizeMeta(meta),
    timestamp: new Date().toISOString()
  }
  console.log(JSON.stringify(payload))
}

/**
 * 记录一条 info 级别日志。
 * @param {string} msg - 人类可读的消息。
 * @param {Record<string, any>} [meta={}] - 附加的结构化元数据。
 * @returns {void}
 */
export function logInfo(msg, meta = {}) {
  emit('info', msg, meta)
}

/**
 * 记录一条 error 级别日志。
 * @param {string} msg - 人类可读的消息。
 * @param {Record<string, any>} [meta={}] - 附加的结构化元数据。
 * @returns {void}
 */
export function logError(msg, meta = {}) {
  emit('error', msg, meta)
}

/**
 * 记录一条 warn 级别日志。
 * @param {string} msg - 人类可读的消息。
 * @param {Record<string, any>} [meta={}] - 附加的结构化元数据。
 * @returns {void}
 */
export function logWarn(msg, meta = {}) {
  emit('warn', msg, meta)
}
