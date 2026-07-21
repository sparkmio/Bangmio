/**
 * 安全响应头中间件
 * 为所有 API 响应添加安全相关 HTTP 头
 */
export function securityHeaders() {
  return async (c, next) => {
    await next()

    c.header('X-Content-Type-Options', 'nosniff')
    c.header('X-Frame-Options', 'DENY')
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    c.header('X-XSS-Protection', '1; mode=block')

    // CSP：允许 Vue 内联样式和 self 脚本
    // 注意：Vue 组件样式是内联的，故 style-src 需要 'unsafe-inline'
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https: http:",
      "connect-src 'self' https:",
      "frame-ancestors 'none'"
    ].join('; ')
    c.header('Content-Security-Policy', csp)
  }
}
