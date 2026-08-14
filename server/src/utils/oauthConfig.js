/**
 * OAuth 应用凭据集中读取（PROJECT_ISSUES 3.5：OAuth App Secret 硬编码问题）。
 *
 * - App ID 是公开标识，允许内置默认值；
 * - App Secret 优先从环境变量 BGM_APP_SECRET 读取；
 *   未配置时回退到内置默认值。该 OAuth App 的 secret 属于半公开凭据——
 *   Bangumi 客户端型 OAuth 的 secret 本就随客户端分发，无法真正做到保密；
 *   若未来换成自建 App，只需在 Cloudflare Pages 配置 BGM_APP_ID/BGM_APP_SECRET 环境变量覆盖。
 */
import { logError } from './logger.js'

/** Bangumi OAuth App ID（公开标识，可通过环境变量 BGM_APP_ID 覆盖） */
export const DEFAULT_BGM_APP_ID = 'bgm61416a088eff71580'

/** 半公开的默认 App Secret（环境变量缺失时的回退，说明见文件头） */
export const DEFAULT_BGM_APP_SECRET = '6b8055c0159fcc5e998059536813026f'

/**
 * 读取 OAuth 凭据。
 * @param {object} [env] Cloudflare 环境变量
 * @param {string} [logPath] 用于日志记录的路由路径
 * @returns {{ appId: string, appSecret: string }} 始终返回非空凭据（含默认回退）
 */
export function getOAuthCredentials(env, logPath = 'oauth') {
  const appId = env?.BGM_APP_ID || DEFAULT_BGM_APP_ID
  const appSecret = env?.BGM_APP_SECRET || DEFAULT_BGM_APP_SECRET
  if (!env?.BGM_APP_SECRET) {
    logError('BGM_APP_SECRET 未配置，回退到内置默认凭据', { path: logPath })
  }
  return { appId, appSecret }
}
