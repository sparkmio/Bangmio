import { logWarn } from './logger.js'

/**
 * 创建跨实例速率限制中间件。
 *
 * 优先使用 D1 中的原子 upsert 计数器（生产 Cloudflare Pages），没有 D1 或表尚未迁移
 * 时回退到当前 isolate 的内存计数器，保证本地开发和旧环境仍可用。
 * @param {number} windowMs - 时间窗口（毫秒）
 * @param {number} max - 窗口内最大请求数
 * @returns {Function} Hono 中间件函数
 */
export function rateLimit(windowMs, max) {
  const localStore = new Map()
  const keyPrefix = `rate:${windowMs}:${max}`

  return async (c, next) => {
    const ip =
      c.req.header('cf-connecting-ip') ||
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown'
    const now = Date.now()
    const d1 = c.env?.DB
    let count
    let resetTime

    if (d1?.prepare) {
      try {
        const row = await d1
          .prepare(
            `INSERT INTO rate_limits (key, count, reset_at)
             VALUES (?, 1, ?)
             ON CONFLICT(key) DO UPDATE SET
               count = CASE WHEN rate_limits.reset_at <= ? THEN 1 ELSE rate_limits.count + 1 END,
               reset_at = CASE WHEN rate_limits.reset_at <= ? THEN ? ELSE rate_limits.reset_at END
             RETURNING count, reset_at`
          )
          .bind(`${keyPrefix}:${ip}`, now + windowMs, now, now, now + windowMs)
          .first()
        count = Number(row?.count)
        resetTime = Number(row?.reset_at)
        if (!Number.isFinite(count) || !Number.isFinite(resetTime))
          throw new Error('D1 returned invalid rate-limit row')
      } catch (err) {
        // Migration 尚未执行或本地 mock 不支持 RETURNING 时，至少保留 isolate 级保护。
        localStoreCleanup(localStore, now)
        const entry = localStore.get(ip)
        if (!entry || now > entry.resetTime) {
          localStore.set(ip, { count: 1, resetTime: now + windowMs })
        } else {
          entry.count += 1
        }
        const fallback = localStore.get(ip)
        count = fallback.count
        resetTime = fallback.resetTime
        if (err?.message && !String(err.message).includes('invalid rate-limit row')) {
          // 不把 D1 连接/迁移细节返回给客户端。
          logWarn('D1 速率限制不可用，已回退内存计数', { error: String(err) })
        }
      }
    } else {
      localStoreCleanup(localStore, now)
      const entry = localStore.get(ip)
      if (!entry || now > entry.resetTime) {
        localStore.set(ip, { count: 1, resetTime: now + windowMs })
      } else {
        entry.count += 1
      }
      const fallback = localStore.get(ip)
      count = fallback.count
      resetTime = fallback.resetTime
    }

    if (count > max) {
      const retryAfter = Math.max(1, Math.ceil((resetTime - now) / 1000))
      logWarn('速率限制触发', { ip, count, max, path: c.req.path })
      c.header('Retry-After', String(retryAfter))
      return c.json({ data: null, error: '请求过于频繁', code: 429 }, 429)
    }

    await next()
  }
}

function localStoreCleanup(store, now) {
  if (store.size <= 10000) return
  for (const [key, entry] of store) {
    if (now > entry.resetTime) store.delete(key)
  }
}
