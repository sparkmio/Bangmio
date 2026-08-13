/**
 * OAuth 应用凭据集中读取（PROJECT_ISSUES 3.5：OAuth App Secret 硬编码问题）。
 *
 * - App ID 是公开标识，允许内置默认值；
 * - App Secret 属于密钥，禁止硬编码在源码中，仅从环境变量 BGM_APP_SECRET 读取。
 *   未配置时返回 null，由路由层返回明确的 503 提示，避免静默回退到源码中的密钥。
 */
import { logError } from './logger.js'

/** Bangumi OAuth App ID（公开标识，可通过环境变量 BGM_APP_ID 覆盖） */
export const DEFAULT_BGM_APP_ID = 'bgm61416a088eff71580'

/**
 * 读取 OAuth 凭据。
 * @param {object} [env] Cloudflare 环境变量
 * @param {string} [logPath] 用于日志记录的路由路径
 * @returns {{ appId: string, appSecret: string | null }} appSecret 未配置时为 null
 */
export function getOAuthCredentials(env, logPath = 'oauth') {
  const appId = env?.BGM_APP_ID || DEFAULT_BGM_APP_ID
  const appSecret = env?.BGM_APP_SECRET || null
  if (!appSecret) {
    logError('BGM_APP_SECRET 未配置，OAuth 授权码流程不可用', { path: logPath })
  }
  return { appId, appSecret }
}
