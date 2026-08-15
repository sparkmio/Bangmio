/**
 * 统一错误处理工具（PROJECT_ISSUES 3.4）。
 *
 * 后端各路由原先各自实现错误格式化：
 * - auth.js 的 errorResponse（处理业务 httpError）
 * - collection.js 的 errorResult（映射 Bangumi 上游 HTTP 状态）
 * 现统一收敛到本模块，响应结构保持不变。
 */

/**
 * 判断错误是否为业务 httpError（带 status 属性）。
 * @param {unknown} err - 捕获的错误。
 * @returns {err is Error & { status: number }}
 */
export function isHttpError(err) {
  return err instanceof Error && typeof err.status === 'number'
}

/**
 * 标准错误响应（auth.js 风格）：httpError 返回对应 status，其他返回 500。
 * @param {unknown} err - 捕获的错误。
 * @param {string} [fallbackMessage] 500 时的提示文案，默认 '服务器内部错误'。
 * @returns {Response} 标准 JSON 响应。
 */
export function errorResponse(err, fallbackMessage = '服务器内部错误') {
  if (err?.code === 'oauth_config_missing') {
    return Response.json(
      {
        data: null,
        error: '服务器未配置 BGM_APP_SECRET，请在 Cloudflare Pages Production 环境变量中添加',
        code: 503
      },
      { status: 503 }
    )
  }
  if (isHttpError(err)) {
    return Response.json(
      { data: null, error: err.message, code: err.status },
      { status: err.status }
    )
  }
  return Response.json({ data: null, error: fallbackMessage, code: 500 }, { status: 500 })
}

/**
 * 上游代理错误映射（collection.js 风格）：
 * 将 Bangumi 等上游的 HTTP 状态映射为统一错误描述。
 * @param {number} [status] - 上游 HTTP 状态码。
 * @param {object} [detail] - 上游响应体（可能含 description/message）。
 * @param {string} [fallback] - 500 时的兜底文案。
 * @returns {{ code: number, error: string | null }} 标准错误结构。
 */
export function upstreamError(status, detail, fallback) {
  if (status === 401) return { code: 401, error: '登录已过期，请重新登录' }
  if (status === 403) return { code: 403, error: '无权限访问' }
  if (status === 404) return { code: 404, error: null }
  return { code: 500, error: detail?.description || detail?.message || fallback }
}
