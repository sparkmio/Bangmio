import { logWarn } from './logger.js'

/**
 * 创建速率限制中间件
 * 基于 IP + 时间窗口的内存计数器，使用惰性清理避免内存泄漏
 * （Cloudflare Workers 不支持 setInterval，故采用惰性清理策略）
 * @param {number} windowMs - 时间窗口（毫秒）
 * @param {number} max - 窗口内最大请求数
 * @returns {Function} Hono 中间件函数
 */
export function rateLimit(windowMs, max) {
  const store = new Map() // key: ip, value: { count, resetTime }

  return async (c, next) => {
    const ip =
      c.req.header('cf-connecting-ip') ||
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown'
    const now = Date.now()

    // 惰性清理：如果 store 过大，清理过期条目
    if (store.size > 10000) {
      for (const [key, entry] of store) {
        if (now > entry.resetTime) store.delete(key)
      }
    }

    let entry = store.get(ip)
    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime: now + windowMs }
      store.set(ip, entry)
    }

    entry.count++

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
      logWarn('速率限制触发', { ip, count: entry.count, max, path: c.req.path })
      c.header('Retry-After', String(retryAfter))
      return c.json({ data: null, error: '请求过于频繁', code: 429 }, 429)
    }

    await next()
  }
}
