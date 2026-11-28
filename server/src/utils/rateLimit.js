import { logWarn } from './logger.js'

export function consumeRateLimit(binding, key, windowMs, max) {
  return binding.getByName(key).consume(windowMs, max)
}

export function rateLimit(windowMs, max, { fallback = 'memory' } = {}) {
  const local = new Map()
  let cleanupAt = 0
  return async (c, next) => {
    const ip = c.req.header('cf-connecting-ip') ||
      (!c.env?.RATE_LIMITS && c.req.header('x-forwarded-for')?.split(',')[0]?.trim()) || 'unknown'
    const now = Date.now()
    let result
    try {
      if (!c.env?.RATE_LIMITS) throw new Error('RATE_LIMITS binding unavailable')
      result = await consumeRateLimit(c.env.RATE_LIMITS, 'ip:' + windowMs + ':' + max + ':' + ip, windowMs, max)
      if (typeof result?.allowed !== 'boolean' || !Number.isFinite(result.resetTime))
        throw new Error('Invalid rate-limit result')
    } catch {
      if (fallback === 'reject') {
        logWarn('Shared rate limiter unavailable', { path: c.req.path })
        return c.json({ data: null, error: '服务暂时不可用，请稍后重试', code: 503 }, 503)
      }
      if (now >= cleanupAt || local.size >= 10000) {
        for (const [key, state] of local) if (state.resetTime <= now) local.delete(key)
        if (local.size >= 10000) local.delete(local.keys().next().value)
        cleanupAt = now + windowMs
      }
      const previous = local.get(ip)
      const state = previous?.resetTime > now ? previous : { count: 0, resetTime: now + windowMs }
      result = { allowed: state.count < max, resetTime: state.resetTime }
      if (result.allowed) local.set(ip, { ...state, count: state.count + 1 })
    }
    if (!result.allowed) {
      c.header('Retry-After', String(Math.max(1, Math.ceil((result.resetTime - now) / 1000))))
      return c.json({ data: null, error: '请求过于频繁', code: 429 }, 429)
    }
    await next()
  }
}
