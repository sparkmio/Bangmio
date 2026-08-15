/**
 * Bangumi OAuth 授权码交换工具。
 *
 * 授权页可以使用国内镜像，但授权码最终优先交给 Bangumi 官方 OAuth
 * 端点交换；镜像异常时再回退到当前请求选择的镜像端点。这样避免镜像
 * 只代理网页、未完整兼容 OAuth token 接口时导致“能授权、回站后登录失败”。
 */
import { logError } from '../utils/logger.js'

export const BGM_OFFICIAL_OAUTH_BASE = 'https://bgm.tv'

/**
 * 用授权码换取 Bangumi access token。
 * @param {{ code: string, appId: string, appSecret: string, redirectUri: string, preferredBase?: string, grantType?: string }} input
 * @returns {Promise<{ accessToken: string, refreshToken: string }>} token 结果
 * @throws {Error & { code?: string, providerStatus?: number, providerError?: string }}
 */
export async function exchangeBangumiOAuthCode({
  code,
  appId,
  appSecret,
  redirectUri,
  preferredBase,
  grantType = 'authorization_code'
}) {
  const bases = [BGM_OFFICIAL_OAUTH_BASE, preferredBase].filter(
    (base, index, list) => base && list.indexOf(base) === index
  )
  let lastError

  for (const base of bases) {
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

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12_000)
    try {
      const response = await fetch(`${base}/oauth/access_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json'
        },
        body: params.toString(),
        signal: controller.signal
      })
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
      lastError = error

      // 4xx 通常是 App ID/Secret、redirect_uri 或授权码本身错误，
      // 回退不会修复它，也避免同一个一次性 code 被重复消费。
      if (response.status < 500) break
    } catch (err) {
      const error = new Error('Bangumi OAuth endpoint unavailable')
      error.code = 'network_error'
      error.providerError = err?.name === 'AbortError' ? 'timeout' : String(err)
      lastError = error
      logError('Bangumi OAuth endpoint request failed', { base, error: error.providerError })
    } finally {
      clearTimeout(timer)
    }
  }

  throw (
    lastError ||
    Object.assign(new Error('Bangumi OAuth endpoint unavailable'), { code: 'network_error' })
  )
}
