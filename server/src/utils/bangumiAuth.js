/**
 * Bangumi access token 的服务端会话 Cookie。
 *
 * 浏览器端不再需要把 Bangumi 原始 token 写入 localStorage；API 请求可通过
 * credentials: include 携带 HttpOnly Cookie，服务端在需要调用 Bangumi 时读取它。
 */
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

export const BANGUMI_ACCESS_COOKIE = 'bangumi_access_token'
export const BANGUMI_REFRESH_COOKIE = 'bangumi_refresh_token'

export function getBangumiAccessToken(c) {
  const header = (c.req.header('Authorization') || '').match(/^Bearer\s+(.+)$/i)
  return String(header?.[1] || getCookie(c, BANGUMI_ACCESS_COOKIE) || '').trim()
}

function cookieOptions(c, overrides = {}) {
  const url = String(c.req.url || '')
  let domain
  try {
    const hostname = new URL(url).hostname
    if (hostname === 'bangmio.site' || hostname.endsWith('.bangmio.site')) domain = '.bangmio.site'
  } catch {
    // 本地开发使用 host-only cookie。
  }
  return {
    httpOnly: true,
    secure: url.startsWith('https://'),
    sameSite: 'Lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
    ...(domain ? { domain } : {}),
    ...overrides
  }
}

export function setBangumiAccessCookie(c, token) {
  const value = String(token || '').trim()
  if (!value) return
  setCookie(c, BANGUMI_ACCESS_COOKIE, value, cookieOptions(c))
}

export function clearBangumiAccessCookie(c) {
  deleteCookie(c, BANGUMI_ACCESS_COOKIE, cookieOptions(c, { maxAge: 0 }))
}

export function getBangumiRefreshToken(c) {
  return String(getCookie(c, BANGUMI_REFRESH_COOKIE) || '').trim()
}

export function setBangumiRefreshCookie(c, token) {
  const value = String(token || '').trim()
  if (!value) return
  setCookie(c, BANGUMI_REFRESH_COOKIE, value, cookieOptions(c))
}

export function clearBangumiRefreshCookie(c) {
  deleteCookie(c, BANGUMI_REFRESH_COOKIE, cookieOptions(c, { maxAge: 0 }))
}
