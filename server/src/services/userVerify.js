/**
 * Bangumi 直登请求的 username 与 token 绑定验证（PROJECT_ISSUES 7.2）。
 *
 * Bangumi 直登用户没有 Bangmio JWT，后端只能拿到 { token, username } 两个值，
 * 恶意用户可伪造 X-Bangumi-Username 头读取他人收藏。
 *
 * 策略：首次请求调用 Bangumi /v0/me 验证 token 归属的 username 与头一致，
 * 结果按 username 缓存 10 分钟（内存级；伪造防护不要求跨实例强一致）。
 * 上游异常时 fail-open 放行（避免上游抖动导致收藏功能整体不可用），
 * 仅在明确拿到「username 不匹配」时拒绝。
 */
import { getClient } from './bangumi.js'
import { logError } from '../utils/logger.js'

/** 已验证 username 的过期时间缓存（username → expiresAt 毫秒时间戳） */
const verifiedStore = new Map()

/** 验证结果缓存时长（毫秒） */
export const USERNAME_VERIFY_TTL = 10 * 60 * 1000

/**
 * 验证直登请求的 username 是否属于该 token。
 * @param {string} token - Bangumi Access Token。
 * @param {string} username - X-Bangumi-Username 头值。
 * @param {boolean} [isChina=false] - 是否使用国内镜像。
 * @returns {Promise<boolean>} true = 验证通过（或上游异常 fail-open）；false = 明确不匹配。
 */
export async function verifyBangumiUsername(token, username, isChina = false) {
  if (!token || !username) return false

  const now = Date.now()
  const expiresAt = verifiedStore.get(username)
  if (expiresAt && expiresAt > now) return true

  try {
    const client = getClient(token, isChina)
    const me = await client.get('/v0/me')
    const match =
      me && (me.username === username || me.nickname === username || String(me.id) === username)
    if (match) {
      verifiedStore.set(username, now + USERNAME_VERIFY_TTL)
      return true
    }
    logError('Bangumi 直登 username 与 token 不匹配', { username })
    return false
  } catch {
    // 上游异常 fail-open：放行本次请求，避免误伤正常用户；下次请求仍会再验证
    return true
  }
}
