import { describe, expect, it, vi } from 'vitest'
import { onRequest } from './callback.js'

describe('OAuth callback Pages function', () => {
  it('serves the Vue entry asset without changing the OAuth callback URL', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('<!doctype html><title>Bangmio</title>'))
    const request = new Request(
      'https://bangmio.site/login/callback?code=oauth-code&state=oauth-state'
    )

    const response = await onRequest({ request, env: { ASSETS: { fetch } } })

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0].toString()).toBe('https://bangmio.site/index.html')
    await expect(response.text()).resolves.toContain('Bangmio')
  })
})
