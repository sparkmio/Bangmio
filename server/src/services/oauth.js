// Credentials and OAuth grants are sent only to the official provider.
import { fetchWithTimeout } from '../utils/http.js'
import { logError } from '../utils/logger.js'

export const BGM_OFFICIAL_OAUTH_BASE = 'https://bgm.tv'

/**
 * 用授权码换取 Bangumi access token。
 * @param {{ code: string, appId: string, appSecret: string, redirectUri: string, grantType?: string }} input
 * @returns {Promise<{ accessToken: string, refreshToken: string }>} token 结果
 * @throws {Error & { code?: string, providerStatus?: number, providerError?: string }}
 */
export async function exchangeBangumiOAuthCode({
  code,
  appId,
  appSecret,
  redirectUri,
  grantType = 'authorization_code'
}) {
  const params = new URLSearchParams({
    grant_type: grantType,
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri
  })
  if (grantType === 'authorization_code') {
    params.set('code', code)
  } else {
    params.set('refresh_token', code)
  }

  try {
    const response = await fetchWithTimeout(`${BGM_OFFICIAL_OAUTH_BASE}/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      },
      body: params.toString(),
      redirect: 'manual'
    }, 5000)
    const data = await response.json().catch(() => ({}))
    const accessToken = data?.access_token
    if (response.ok && accessToken) {
      return {
        accessToken,
        refreshToken: data?.refresh_token || ''
      }
    }

    const error = new Error(data?.error_description || data?.error || `HTTP ${response.status}`)
    error.code = 'provider_error'
    error.providerStatus = response.status
    error.providerError = data?.error || ''
    throw error
  } catch (err) {
    if (err?.code === 'provider_error') throw err
    logError('Bangumi OAuth endpoint request failed', { error: err?.name })
    throw Object.assign(new Error('Bangumi OAuth endpoint unavailable'), { code: 'network_error' })
  }
}
