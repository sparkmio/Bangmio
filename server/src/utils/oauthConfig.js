/**
 * OAuth 应用凭据集中读取（PROJECT_ISSUES 3.5：OAuth App Secret 硬编码问题）。
 *
 * - App ID 是公开标识，允许内置默认值；
 * - App Secret 必须从环境变量 BGM_APP_SECRET 读取，绝不保存在仓库内。
 */
import { logError } from './logger.js'

/** Bangumi OAuth App ID（公开标识，可通过环境变量 BGM_APP_ID 覆盖） */
export const DEFAULT_BGM_APP_ID = 'bgm61416a088eff71580'

/**
 * 读取 OAuth 凭据。
 * @param {object} [env] Cloudflare 环境变量
 * @param {string} [logPath] 用于日志记录的路由路径
 * @returns {{ appId: string, appSecret: string }}
 * @throws {Error} 当 BGM_APP_SECRET 未配置时抛出。
 */
export function getOAuthCredentials(env, logPath = 'oauth') {
  const appId = env?.BGM_APP_ID || DEFAULT_BGM_APP_ID
  const appSecret = env?.BGM_APP_SECRET
  if (!appSecret) {
    logError('BGM_APP_SECRET 未配置', { path: logPath })
    const error = new Error('OAuth 服务未配置')
    error.code = 'oauth_config_missing'
    throw error
  }
  return { appId, appSecret }
}
