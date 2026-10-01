import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/bangumi.js', () => ({
  getClient: vi.fn()
}))

vi.mock('../services/oauth.js', () => ({
  exchangeBangumiOAuthCode: vi.fn()
}))

import app from './user.js'
import { getClient } from '../services/bangumi.js'
import { exchangeBangumiOAuthCode } from '../services/oauth.js'

const env = {
  BGM_APP_ID: 'test-app',
  BGM_APP_SECRET: 'test-secret',
  OAUTH_REDIRECT_URI: 'https://bangmio.site/login/callback'
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('Bangumi OAuth login', () => {
  it('签发 state Cookie，并拒绝不匹配的 OAuth 回调', async () => {
    const authorize = await app.request('https://bangmio.site/oauth-url', undefined, env)
    const { data: url } = await authorize.json()
    const state = new URL(url).searchParams.get('state')
    const cookie = authorize.headers.get('set-cookie')

    expect(state).toBeTruthy()
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).toContain('Domain=.bangmio.site')
    expect(cookie).toContain('Path=/')

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

describe('OAuth token Cookie', () => {
  it('OAuth 登录将 access/refresh token 写入 HttpOnly Cookie，不返回明文', async () => {
    exchangeBangumiOAuthCode.mockResolvedValue({
      accessToken: 'oauth-access-token',
      refreshToken: 'oauth-refresh-token'
    })
    const get = vi.fn().mockResolvedValue({ id: 12345, username: 'oauth-user' })
    getClient.mockReturnValue({ get })

    const authorize = await app.request('https://bangmio.site/oauth-url', undefined, env)
    const { data: url } = await authorize.json()
    const state = new URL(url).searchParams.get('state')
    const stateCookie = authorize.headers.get('set-cookie')

    const response = await app.request(
      'https://bangmio.site/oauth-callback',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: stateCookie },
        body: JSON.stringify({ code: 'authorization-code', state })
      },
      env
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload).toEqual({
      data: { user: { id: 12345, username: 'oauth-user' }, authenticated: true }
    })
    expect(JSON.stringify(payload)).not.toContain('oauth-access-token')
    expect(JSON.stringify(payload)).not.toContain('oauth-refresh-token')
    const cookie = response.headers.get('set-cookie')
    expect(cookie).toContain('bangumi_access_token=oauth-access-token')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('bangumi_refresh_token=oauth-refresh-token')
  })

  it('退出登录会同时清除 access 与 refresh Cookie', async () => {
    const response = await app.request('https://bangmio.site/logout', { method: 'POST' }, env)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ data: { success: true }, code: 200 })
    const cookies = response.headers.getSetCookie?.() || [response.headers.get('set-cookie')]
    const cookieText = cookies.join('; ')
    expect(cookieText).toContain('bangumi_access_token=')
    expect(cookieText).toContain('bangumi_refresh_token=')
    expect(cookieText).toContain('Max-Age=0')
  })
  it('刷新接口可从 HttpOnly refresh Cookie 读取并轮换 Cookie', async () => {
    exchangeBangumiOAuthCode.mockResolvedValue({
      accessToken: 'rotated-access-token',
      refreshToken: 'rotated-refresh-token'
    })
    const get = vi.fn().mockResolvedValue({ id: 12345, username: 'oauth-user' })
    getClient.mockReturnValue({ get })

    const response = await app.request(
      'https://bangmio.site/refresh-token',
      {
        method: 'POST',
        headers: { Cookie: 'bangumi_refresh_token=stored-refresh-token' }
      },
      env
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: { user: { id: 12345, username: 'oauth-user' }, authenticated: true }
    })
    expect(exchangeBangumiOAuthCode).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'stored-refresh-token', grantType: 'refresh_token' })
    )
    const cookie = response.headers.get('set-cookie')
    expect(cookie).toContain('bangumi_access_token=rotated-access-token')
    expect(cookie).toContain('bangumi_refresh_token=rotated-refresh-token')
  })
})

describe('Bangumi access token Cookie', () => {
  it('可仅凭 HttpOnly Cookie 调用 /me', async () => {
    const get = vi.fn().mockResolvedValue({ id: 12345, username: 'cookie-user' })
    getClient.mockReturnValue({ get })

    const response = await app.request(
      'https://bangmio.site/me',
      { headers: { Cookie: 'bangumi_access_token=cookie-token' } },
      env
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: { id: 12345, username: 'cookie-user' }
    })
    expect(getClient).toHaveBeenCalledWith('cookie-token', false)
    expect(get).toHaveBeenCalledWith('/v0/me')
  })

  it('直登成功后写入 HttpOnly Cookie', async () => {
    const get = vi.fn().mockResolvedValue({ id: 12345, username: 'cookie-user' })
    getClient.mockReturnValue({ get })

    const response = await app.request(
      'https://bangmio.site/auth',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'submitted-token' })
      },
      env
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: { user: { id: 12345, username: 'cookie-user' }, authenticated: true },
      code: 200
    })
    const cookie = response.headers.get('set-cookie')
    expect(cookie).toContain('bangumi_access_token=submitted-token')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
  })
})

describe('user group member count parsing', () => {
  it('保留 Bangumi 用户小组页的“位成员”精确成员数', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          `
            <ul id="memberGroupList">
              <li>
                <strong><a href="/group/fillgrids" class="avatar"><img src="//lain.bgm.tv/pic/icon/m/1.jpg" />补旧番</a></strong>
                <small>16,397 位成员</small>
              </li>
            </ul>
          `,
          { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
      )
    )

    const response = await app.request('https://bangmio.site/acgpzh/groups', undefined, env)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: [
        {
          id: 'fillgrids',
          name: '补旧番',
          avatar: 'https://lain.bgm.tv/pic/icon/m/1.jpg',
          member_count: 16397
        }
      ]
    })
  })
})
