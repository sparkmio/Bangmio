/**
 * Bangumi 直登请求的 username 与 token 绑定验证（PROJECT_ISSUES 7.2）。
 *
 * Bangumi 直登用户没有 Bangmio JWT，后端只能拿到 { token, username } 两个值，
 * 恶意用户可伪造 X-Bangumi-Username 头读取他人收藏。
 *
 * 策略：首次请求调用 Bangumi /v0/me 验证 token 归属的 username 与头一致，
 * 结果按 token 指纹、username 和地区缓存 10 分钟（内存级）。
 * 上游异常时 fail-closed，避免验证服务不可用时放行伪造身份。
 */
import { getClient } from './bangumi.js'
import { logError } from '../utils/logger.js'
import { bufferToHex } from '../utils/crypto.js'

/** 已验证身份的过期时间缓存（token 指纹 + username + 地区 → expiresAt） */
const verifiedStore = new Map()

async function cacheKey(token, username, isChina) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return [bufferToHex(digest), username, isChina ? 'CN' : 'global'].join(':')
}

/** 验证结果缓存时长（毫秒） */
export const USERNAME_VERIFY_TTL = 10 * 60 * 1000

/**
 * 验证直登请求的 username 是否属于该 token。
 * @param {string} token - Bangumi Access Token。
 * @param {string} username - X-Bangumi-Username 头值。
 * @param {boolean} [isChina=false] - 是否使用国内镜像。
 * @returns {Promise<boolean>} true = 验证通过；false = 身份不匹配或上游异常。
 */
export async function verifyBangumiUsername(token, username, isChina = false) {
  if (!token || !username) return false

  const now = Date.now()
  const key = await cacheKey(token, username, isChina)
  const expiresAt = verifiedStore.get(key)
  if (expiresAt && expiresAt > now) return true

  try {
    const client = getClient(token, isChina)
    const me = await client.get('/v0/me')
    const match =
      me && (me.username === username || me.nickname === username || String(me.id) === username)
    if (match) {
      verifiedStore.set(key, now + USERNAME_VERIFY_TTL)
      return true
    }
    logError('Bangumi 直登 username 与 token 不匹配', { username })
    return false
  } catch (error) {
    logError('Bangumi 直登身份验证失败', {
      username,
      reason: error instanceof Error ? error.message : 'unknown'
    })
    return false
  }
}
