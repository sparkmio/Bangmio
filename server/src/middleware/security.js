/**
 * 安全响应头中间件
 * 为所有 API 响应添加安全相关 HTTP 头
 */
export function securityHeaders() {
  return async (c, next) => {
    await next()

    const embeddablePage = /^\/api\/v1\/(?:wikipedia|moegirl|douban)\/page\//.test(c.req.path)

    c.header('X-Content-Type-Options', 'nosniff')
    c.header('X-Frame-Options', embeddablePage ? 'SAMEORIGIN' : 'DENY')
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    c.header('X-XSS-Protection', '1; mode=block')

    // API 响应不需要执行脚本；外部资料页只允许被本站 iframe 嵌入，并禁止表单/脚本/连接能力。
    const csp = [
      "default-src 'none'",
      "script-src 'none'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https:",
      "connect-src 'self' https:",
      "base-uri 'none'",
      "form-action 'none'",
      embeddablePage ? "frame-ancestors 'self'" : "frame-ancestors 'none'"
    ].join('; ')
    c.header('Content-Security-Policy', csp)
  }
}
