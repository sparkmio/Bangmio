/**
 * HS256 JWT 签发与验证工具（Cloudflare Pages / Hono 后端）。
 *
 * 完全基于 Web Crypto API 的 HMAC 实现，不依赖 `node:crypto`，
 * 可在 Cloudflare Workers 与 Node 18+ 环境中运行。
 *
 * 用法：
 *   import { signJwt, verifyJwt } from '../utils/jwt.js'
 *   const token = await signJwt({ userId: 'u1', email: 'a@b.c' }, env.JWT_SECRET)
 *   const { valid, payload, error } = await verifyJwt(token, env.JWT_SECRET)
 */

/** JWT 默认有效期：7 天（秒） */
const DEFAULT_EXPIRES_IN = 7 * 24 * 3600

/** JWT 签名算法 */
const JWT_ALG = 'HS256'

/**
 * 字符串转为 UTF-8 Uint8Array。
 * @param {string} str - 输入字符串。
 * @returns {Uint8Array} UTF-8 字节。
 */
function strToBytes(str) {
  return new TextEncoder().encode(str)
}

/**
 * base64url 编码（RFC 7515）：URL 安全、无填充。
 * @param {ArrayBuffer|Uint8Array} data - 输入字节。
 * @returns {string} base64url 字符串。
 */
export function base64urlEncode(data) {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * base64url 解码（RFC 7515）：URL 安全、无填充。
 * @param {string} str - base64url 字符串。
 * @returns {Uint8Array} 解码后的字节。
 */
export function base64urlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (str.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * 常量时间字符串比较，防止时序攻击。
 * @param {string} a - 字符串 A。
 * @param {string} b - 字符串 B。
 * @returns {boolean} 是否相等。
 */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

/**
 * 使用 HMAC-SHA256 计算消息认证码。
 * @param {string} message - 待签名消息。
 * @param {string} secret - HMAC 密钥。
 * @returns {Promise<ArrayBuffer>} HMAC 摘要。
 */
async function hmacSha256(message, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    strToBytes(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return crypto.subtle.sign('HMAC', key, strToBytes(message))
}

/**
 * 签发 HS256 JWT。
 *
 * payload 中会自动注入 `iat`（签发时间，秒）与 `exp`（过期时间，秒）。
 * 调用方传入的 `userId`、`email` 必填，`bgmUid` 可选；其它字段会被原样保留。
 *
 * @param {{ userId: string, email: string, bgmUid?: string } & Record<string, unknown>} payload
 *   业务载荷。
 * @param {string} secret - JWT_SECRET（至少 32 字符）。
 * @param {number} [expiresInSeconds=604800] - 有效期（秒），默认 7 天。
 * @returns {Promise<string>} 形如 `header.payload.signature` 的 JWT 字符串。
 */
export async function signJwt(payload, secret, expiresInSeconds = DEFAULT_EXPIRES_IN) {
  const header = { alg: JWT_ALG, typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const body = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds
  }
  const encHeader = base64urlEncode(strToBytes(JSON.stringify(header)))
  const encBody = base64urlEncode(strToBytes(JSON.stringify(body)))
  const signingInput = `${encHeader}.${encBody}`
  const sig = await hmacSha256(signingInput, secret)
  const encSig = base64urlEncode(sig)
  return `${signingInput}.${encSig}`
}

/**
 * 验证 HS256 JWT 的签名与过期时间。
 *
 * @param {string} token - 待验证的 JWT 字符串。
 * @param {string} secret - 签发时使用的 JWT_SECRET。
 * @returns {Promise<{ valid: boolean, payload?: object, error?: string }>}
 *   验证通过返回 `{ valid: true, payload }`；失败返回 `{ valid: false, error }`。
 */
export async function verifyJwt(token, secret) {
  if (typeof token !== 'string' || token.length === 0) {
    return { valid: false, error: 'token 为空' }
  }
  const parts = token.split('.')
  if (parts.length !== 3) {
    return { valid: false, error: 'token 格式错误' }
  }
  const [encHeader, encBody, encSig] = parts
  const signingInput = `${encHeader}.${encBody}`

  // 签名校验（常量时间比较）
  let expectedSig
  try {
    expectedSig = await hmacSha256(signingInput, secret)
  } catch {
    return { valid: false, error: '签名计算失败' }
  }
  const expectedSigB64 = base64urlEncode(expectedSig)
  if (!timingSafeEqual(expectedSigB64, encSig)) {
    return { valid: false, error: '签名不匹配' }
  }

  // 解析 payload
  let payload
  try {
    payload = JSON.parse(new TextDecoder().decode(base64urlDecode(encBody)))
  } catch {
    return { valid: false, error: 'payload 解析失败' }
  }

  // 过期校验
  const now = Math.floor(Date.now() / 1000)
  if (typeof payload.exp !== 'number' || now >= payload.exp) {
    return { valid: false, error: 'token 已过期' }
  }

  return { valid: true, payload }
}
