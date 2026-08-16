import { afterEach, describe, expect, it, vi } from 'vitest'
import app from './user.js'

const env = {
  BGM_APP_ID: 'test-app',
  BGM_APP_SECRET: 'test-secret',
  OAUTH_REDIRECT_URI: 'https://bangmio.site/login/callback'
}

afterEach(() => {
  vi.unstubAllGlobals()
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
