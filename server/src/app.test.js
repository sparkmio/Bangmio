import { describe, expect, it } from 'vitest'
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

function createRateLimitDb() {
  const rows = new Map()
  return {
    prepare() {
      return {
        bind(key, initialReset, now) {
          return {
            async first() {
              const previous = rows.get(key)
              const current =
                !previous || previous.reset_at <= now
                  ? { count: 1, reset_at: initialReset }
                  : { ...previous, count: previous.count + 1 }
              rows.set(key, current)
              return current
            }
          }
        }
      }
    }
  }
}

describe('AI request quota', () => {
  it('limits chat and suggestion requests together to 30 per IP per hour', async () => {
    const env = { DB: createRateLimitDb() }
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
