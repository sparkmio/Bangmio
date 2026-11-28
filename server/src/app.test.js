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
  const env = { DB: { prepare: vi.fn() }, RATE_LIMITS: createRateLimitBinding() }
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

describe('production without D1', () => {
  it.each([
    ['POST', 'login'],
    ['POST', 'register'],
    ['POST', 'send-code'],
    ['POST', 'reset-password'],
    ['POST', 'oauth-bind-callback'],
    ['GET', 'bgm-token']
  ])('retires %s /auth/%s before hitting the shared quota', async (method, path) => {
    const RATE_LIMITS = createRateLimitBinding()
    const response = await app.request(`/api/v1/auth/${path}`, { method }, { RATE_LIMITS })
    expect(response.status).toBe(410)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toMatchObject({ code: 410 })
    expect(RATE_LIMITS.getByName).not.toHaveBeenCalled()
  })

  it('starts direct OAuth with the configured callback', async () => {
    const OAUTH_REDIRECT_URI = 'https://bangmio.site/login/callback'
    const response = await app.request('/api/v1/user/oauth-url', undefined, {
      BGM_APP_SECRET: 'mock-secret-for-unit-test',
      OAUTH_REDIRECT_URI,
      RATE_LIMITS: createRateLimitBinding()
    })
    expect(response.status).toBe(200)
    const url = new URL((await response.json()).data)
    expect(`${url.origin}${url.pathname}`).toBe('https://bgm.tv/oauth/authorize')
    expect(url.searchParams.get('redirect_uri')).toBe(OAUTH_REDIRECT_URI)
    expect(response.headers.get('Set-Cookie')).toContain(`bangmio_oauth_state=${url.searchParams.get('state')}`)
  })

  it('authenticates an Access Token and uses the session to read collections', async () => {
    const user = { id: 1, username: 'db-free-test' }
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const path = new URL(input).pathname
      if (path === '/v0/me') return Response.json(user)
      if (path === '/v0/users/db-free-test/collections') return Response.json({ data: [], total: 0 })
      throw new Error(`Unexpected upstream path: ${path}`)
    })
    try {
      const env = { RATE_LIMITS: createRateLimitBinding() }
      const login = await app.request('/api/v1/user/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'mock-bangumi-access-token' })
      }, env)
      expect(login.status).toBe(200)
      await expect(login.json()).resolves.toMatchObject({ data: { user, authenticated: true } })
      const session = login.headers.get('Set-Cookie')
      expect(session).toContain('HttpOnly')
      const headers = { Cookie: session.split(';')[0], 'X-Bangumi-Username': user.username }
      const me = await app.request('/api/v1/user/me', { headers }, env)
      await expect(me.json()).resolves.toEqual({ data: user })
      const collections = await app.request('/api/v1/collection/list', { headers }, env)
      expect(collections.status).toBe(200)
      await expect(collections.json()).resolves.toEqual({ data: [], total: 0 })
    } finally {
      fetch.mockRestore()
    }
  })

  it('still limits collection writes through the Durable Object', async () => {
    const env = { RATE_LIMITS: createRateLimitBinding() }
    const request = () => app.request('/api/v1/collection/1424', {
      method: 'POST',
      headers: { 'cf-connecting-ip': '198.51.100.44' }
    }, env)
    for (let count = 0; count < 10; count++) expect((await request()).status).toBe(401)
    expect((await request()).status).toBe(429)
  })
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
