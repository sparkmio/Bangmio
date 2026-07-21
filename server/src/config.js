/**
 * Bangmio 服务端集中配置
 * 所有 TTL、超时、UA、镜像域名等常量集中在此管理
 *
 * 注：TTL 值以各路由实际使用值为准（首批重构时保留原值）。
 */

/** 默认缓存有效期（毫秒） */
export const CACHE_TTL_DEFAULT = 10 * 60 * 1000 // 10 分钟

/** 小组路由缓存 TTL（5 分钟，与 groups.js 原值一致） */
export const CACHE_TTL_GROUPS = 5 * 60 * 1000

/** 豆瓣路由缓存 TTL（10 分钟，与 douban.js 原值一致） */
export const CACHE_TTL_DOUBAN = 10 * 60 * 1000

/** B站路由缓存 TTL（10 分钟，与 bilibili.js 原值一致） */
export const CACHE_TTL_BILIBILI = 10 * 60 * 1000

/** 评论路由缓存 TTL（5 分钟，与 comments.js 原值一致） */
export const CACHE_TTL_COMMENTS = 5 * 60 * 1000

/** 萌娘百科路由缓存 TTL（30 分钟，与 moegirl.js 原值一致） */
export const CACHE_TTL_MOEGIRL = 30 * 60 * 1000

/** HTTP 抓取默认超时（毫秒） */
export const HTTP_TIMEOUT = 8000

/** Bangumi 官方 API 主机 */
export const BGM_API_HOST = 'api.bgm.tv'

/** Bangumi 镜像主机（国内加速） */
export const BGM_MIRROR_HOST = 'api.bangumi.lol'

/** Bangumi 图片主机 */
export const BGM_IMAGE_HOST = 'lain.bgm.tv'

/** Bangumi 镜像图片主机 */
export const BGM_MIRROR_IMAGE_HOST = 'lain.bangumi.lol'

/** 速率限制窗口（毫秒，1 分钟） */
export const RATE_LIMIT_WINDOW = 60 * 1000

/** POST 路由速率限制（次/窗口） */
export const RATE_LIMIT_MAX_POST = 10

/** GET 路由速率限制（次/窗口） */
export const RATE_LIMIT_MAX_GET = 60

/** 评论内容最大长度 */
export const MAX_CONTENT_LENGTH = 5000

/** 话题标题最大长度 */
export const MAX_TITLE_LENGTH = 200
