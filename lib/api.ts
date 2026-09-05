import type { ApiResult } from './types'

const DEFAULT_ORIGIN = 'http://localhost:3001'

function apiUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path
  if (typeof window !== 'undefined') return path.startsWith('/api/') ? path : `/api/v1${path}`
  const origin =
    process.env.BANGMIO_API_ORIGIN || process.env.NEXT_PUBLIC_API_ORIGIN || DEFAULT_ORIGIN
  return `${origin.replace(/\/$/, '')}${path.startsWith('/api/') ? path : `/api/v1${path}`}`
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  token?: string,
  username?: string
) {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (username) headers.set('X-Bangumi-Username', username)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
    credentials: 'include',
    signal: init.signal
      ? AbortSignal.any([init.signal, AbortSignal.timeout(25000)])
      : AbortSignal.timeout(25000),
    ...(token ||
    username ||
    headers.has('Authorization') ||
    headers.has('X-Bangumi-Username') ||
    init.cache === 'no-store' ||
    (init.method && init.method.toUpperCase() !== 'GET')
      ? { cache: 'no-store' as const }
      : { next: { revalidate: 120 } })
  })

  const payload = (await response.json().catch(() => null)) as ApiResult<T> | null
  if (!response.ok) {
    const error = new Error(payload?.error || `请求失败 (${response.status})`) as Error & {
      status?: number
    }
    error.status = response.status
    throw error
  }
  // Legacy comment writes return { success: true }; collection DELETE returns { message }.
  // Accept those acknowledgements only for writes, never as successful page data.
  const acknowledgement = payload as { success?: boolean; message?: unknown } | null
  const isWrite = Boolean(init.method && !['GET', 'HEAD'].includes(init.method.toUpperCase()))
  const acknowledged =
    isWrite &&
    (acknowledgement?.success === true ||
      (typeof acknowledgement?.message === 'string' && acknowledgement.message.length > 0))
  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload) ||
    payload.error ||
    (!('data' in payload) && !acknowledged)
  ) {
    throw Object.assign(new Error('服务返回的数据格式异常，请重试'), { status: 502 })
  }
  return payload
}

/** Optional data only: callers must render an error when null, not an empty state. */
export async function safeApiFetch<T>(path: string, init: RequestInit = {}) {
  try {
    return await apiFetch<T>(path, init)
  } catch {
    return null
  }
}

export function imageUrl(images?: {
  large?: string
  medium?: string
  common?: string
  grid?: string
}) {
  if (!images) return ''
  return images.large || images.medium || images.common || images.grid || ''
}

export function displayName(subject?: { name?: string; name_cn?: string }) {
  return subject?.name_cn || subject?.name || '未命名条目'
}

export function avatarUrl(user?: {
  avatar?: { large?: string; medium?: string; small?: string } | string
}) {
  if (typeof user?.avatar === 'string') return user.avatar
  return user?.avatar?.large || user?.avatar?.medium || user?.avatar?.small || ''
}
