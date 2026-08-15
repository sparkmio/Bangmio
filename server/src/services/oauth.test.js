import { afterEach, describe, expect, it, vi } from 'vitest'
import { BGM_OFFICIAL_OAUTH_BASE, exchangeBangumiOAuthCode } from './oauth.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('exchangeBangumiOAuthCode', () => {
  it('优先使用 Bangumi 官方 OAuth 端点交换授权码', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ access_token: 'access-token', refresh_token: 'refresh-token' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    )

    await expect(
      exchangeBangumiOAuthCode({
        code: 'authorization-code',
        appId: 'app-id',
        appSecret: 'app-secret',
        redirectUri: 'https://bangmio.site/login/callback',
        preferredBase: 'https://bangumi.lol'
      })
    ).resolves.toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe(`${BGM_OFFICIAL_OAUTH_BASE}/oauth/access_token`)
  })

  it('官方端点网络失败时回退到国内镜像端点', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'mirror-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

    await expect(
      exchangeBangumiOAuthCode({
        code: 'authorization-code',
        appId: 'app-id',
        appSecret: 'app-secret',
        redirectUri: 'https://bangmio.site/login/callback',
        preferredBase: 'https://bangumi.lol'
      })
    ).resolves.toMatchObject({ accessToken: 'mirror-token' })

    expect(fetchMock.mock.calls[1][0]).toBe('https://bangumi.lol/oauth/access_token')
  })

  it('保留上游 invalid_client 错误类型供路由给出明确提示', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'invalid_client' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    )

    await expect(
      exchangeBangumiOAuthCode({
        code: 'authorization-code',
        appId: 'app-id',
        appSecret: 'app-secret',
        redirectUri: 'https://bangmio.site/login/callback'
      })
    ).rejects.toMatchObject({ code: 'provider_error', providerError: 'invalid_client' })
  })
})
