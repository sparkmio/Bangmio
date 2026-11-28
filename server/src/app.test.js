import { describe, expect, it, vi } from 'vitest'
import app from './app.js'

describe('health endpoints', () => {
  it('supports the versioned API health route used by Next/OpenNext', async () => {
    const response = await app.request(
      'https://bangmio.site/api/v1/health',
      { headers: { 'cf-ipcountry': 'CN' } },
      {}
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: 'ok', country: 'CN' })
  })
})

function createRateLimitBinding() {
  const rows = new Map()
  return {
    getByName: vi.fn(key => ({
      async consume(windowMs, max) {
        const now = Date.now()
        const previous = rows.get(key)
        const state = previous?.resetTime > now ? previous : { count: 0, resetTime: now + windowMs }
        const allowed = state.count < max
        if (allowed) state.count++
        rows.set(key, state)
        return { allowed, resetTime: state.resetTime }
      }
    }))
  }
}

it('1,000 public anime reads do not touch either rate-limit store', async () => {
  const RATE_LIMITS = createRateLimitBinding()
  const DB = { prepare: vi.fn() }
  const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
    new Response(JSON.stringify({ id: 1424, name: 'K-ON!', type: 2 }), {
      headers: { 'Content-Type': 'application/json' }
    })
  )
  try {
    for (let count = 0; count < 1000; count++) {
      const response = await app.request('/api/v1/anime/1424', undefined, { DB, RATE_LIMITS })
      expect(response.status).toBe(200)
    }
    expect(DB.prepare).not.toHaveBeenCalled()
    expect(RATE_LIMITS.getByName).not.toHaveBeenCalled()
  } finally {
    fetch.mockRestore()
  }
})

it('keeps the stricter authentication window and Retry-After', async () => {
  const env = { RATE_LIMITS: createRateLimitBinding() }
  const request = () => app.request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '198.51.100.43' },
    body: '{}'
  }, env)
  for (let count = 0; count < 5; count++) expect((await request()).status).not.toBe(429)
  const blocked = await request()
  expect(blocked.status).toBe(429)
  expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThan(0)
})

describe('AI request quota', () => {
  it('limits chat and suggestion requests together to 30 per IP per hour', async () => {
    const env = { RATE_LIMITS: createRateLimitBinding() }
    const request = path =>
      app.request(
        `https://bangmio.site/api/v1/ai/${path}`,
        {
          method: 'POST',
          headers: { 'cf-connecting-ip': '198.51.100.42', 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [] })
        },
        env
      )

    for (let count = 0; count < 30; count += 1) {
      const path = count % 2 === 0 ? 'chat' : 'suggestions'
      expect((await request(path)).status).toBe(path === 'chat' ? 400 : 503)
    }
    expect((await request('chat')).status).toBe(429)
  })

  it('fails closed when the shared quota store is unavailable', async () => {
    const response = await app.request(
      'https://bangmio.site/api/v1/ai/chat',
      {
        method: 'POST',
        headers: { 'cf-connecting-ip': '198.51.100.43', 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [] })
      },
      {}
    )

    expect(response.status).toBe(503)
  })
})
