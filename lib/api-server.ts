import { headers as getRequestHeaders } from 'next/headers'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { ApiResult } from './types'
// @ts-expect-error — the shared cache helper remains JavaScript with the Hono server.
import { createCache } from '../server/src/utils/cache.js'
// @ts-expect-error — the existing Hono entrypoint is JavaScript during the incremental migration.
import legacyApp from '../server/src/app.js'

type HonoFetcher = {
  fetch: (
    request: Request,
    env?: Record<string, unknown>,
    context?: unknown
  ) => Response | Promise<Response>
}

const app = legacyApp as HonoFetcher
const responseCache = createCache(120_000, 500)
const staleAnimeCache = createCache(30 * 60_000, 500)
const inFlightRequests = new Map<string, Promise<ApiResult<unknown>>>()
const RETRY_DELAY_MS = 120

function isStaleCacheableAnimePath(path: string) {
  return /^\/api\/v1\/anime\/[1-9]\d*(?:\/(?:relations|characters|persons|episodes))?(?:\?.*)?$/.test(
    path
  )
}

function apiPath(path: string) {
  const target = path.startsWith('/api/')
    ? path
    : `/api/v1${path.startsWith('/') ? path : `/${path}`}`
  if (!target.startsWith('/api/v1/')) throw new TypeError('Server API only accepts /api/v1 paths')
  return target
}

function shouldRetry(error: unknown) {
  const status = (error as { status?: number } | null)?.status
  return status === undefined || status === 408 || status === 429 || status >= 500
}

function waitBeforeRetry() {
  return new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
}

async function fetchServerPayload<T>(target: string, country: string, cacheKey: string) {
  const canUseStaleCache = isStaleCacheableAnimePath(target)

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const cloudflare = await getCloudflareContext({ async: true }).catch(() => null)
      const request = new Request(`https://bangmio.internal${target}`, {
        headers: {
          Accept: 'application/json',
          ...(country ? { 'cf-ipcountry': country } : {})
        },
        signal: AbortSignal.timeout(25_000)
      })
      const response = await app.fetch(
        request,
        (cloudflare?.env || {}) as Record<string, unknown>,
        cloudflare?.ctx
      )
      const payload = (await response.json().catch(() => null)) as ApiResult<T> | null
      if (!response.ok) {
        const error = new Error(payload?.error || `请求失败 (${response.status})`) as Error & {
          status?: number
        }
        error.status = response.status
        throw error
      }

      if (
        !payload ||
        typeof payload !== 'object' ||
        Array.isArray(payload) ||
        payload.error ||
        !('data' in payload)
      ) {
        throw Object.assign(new Error('服务返回的数据格式异常，请重试'), { status: 502 })
      }

      if (payload.degraded !== true) {
        responseCache.set(cacheKey, payload)
        if (canUseStaleCache) staleAnimeCache.set(cacheKey, payload)
      }
      return payload
    } catch (error) {
      if (attempt === 0 && shouldRetry(error)) {
        await waitBeforeRetry()
        continue
      }

      const status = (error as { status?: number } | null)?.status
      const canFallback = status === undefined || status === 429 || status >= 500
      const stale = canUseStaleCache && canFallback ? staleAnimeCache.get(cacheKey) : null
      if (stale) return { ...stale, stale: true } as ApiResult<T>
      throw error
    }
  }

  throw new Error('请求失败')
}

/** Server Components dispatch to the co-located Hono app instead of making a Worker self-request. */
export async function apiFetchServer<T>(path: string): Promise<ApiResult<T>> {
  const target = apiPath(path)
  const requestHeaders = await getRequestHeaders().catch(() => null)
  const country = requestHeaders?.get('cf-ipcountry') || ''
  const cacheKey = `${country || 'global'}:${target}`
  const cached = responseCache.get(cacheKey)
  if (cached) return cached as ApiResult<T>
  const inFlight = inFlightRequests.get(cacheKey)
  if (inFlight) return inFlight as Promise<ApiResult<T>>

  const request = fetchServerPayload<T>(target, country, cacheKey)
  inFlightRequests.set(cacheKey, request as Promise<ApiResult<unknown>>)
  try {
    return await request
  } finally {
    if (inFlightRequests.get(cacheKey) === request) inFlightRequests.delete(cacheKey)
  }
}

export async function safeApiFetchServer<T>(path: string) {
  try {
    return await apiFetchServer<T>(path)
  } catch {
    return null
  }
}
