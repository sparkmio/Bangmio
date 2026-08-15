import { describe, expect, it } from 'vitest'
import app from './user.js'

const env = {
  BGM_APP_ID: 'test-app',
  BGM_APP_SECRET: 'test-secret',
  OAUTH_REDIRECT_URI: 'https://bangmio.site/login/callback'
}

describe('Bangumi OAuth login', () => {
  it('签发 state Cookie，并拒绝不匹配的 OAuth 回调', async () => {
    const authorize = await app.request('https://bangmio.site/oauth-url', undefined, env)
    const { data: url } = await authorize.json()
    const state = new URL(url).searchParams.get('state')
    const cookie = authorize.headers.get('set-cookie')

    expect(state).toBeTruthy()
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Lax')

    const callback = await app.request(
      'https://bangmio.site/oauth-callback',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ code: 'attacker-code', state: 'mismatched-state' })
      },
      env
    )

    expect(callback.status).toBe(400)
    await expect(callback.json()).resolves.toMatchObject({
      error: '授权状态无效或已过期，请重新登录'
    })
    expect(callback.headers.get('set-cookie')).toContain('Max-Age=0')
  })
})
