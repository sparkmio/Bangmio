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
        redirectUri: 'https://bangmio.site/login/callback'
      })
    ).resolves.toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe(`${BGM_OFFICIAL_OAUTH_BASE}/oauth/access_token`)
  })

  it('官方端点失败时不会将客户端密钥或授权码交给镜像', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'))
    await expect(
      exchangeBangumiOAuthCode({
        code: 'authorization-code',
        appId: 'app-id',
        appSecret: 'app-secret',
        redirectUri: 'https://bangmio.site/login/callback'
      })
    ).rejects.toMatchObject({ code: 'network_error' })
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      `${BGM_OFFICIAL_OAUTH_BASE}/oauth/access_token`,
      expect.objectContaining({ redirect: 'manual' })
    )
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
