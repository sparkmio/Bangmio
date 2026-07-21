/**
 * CF Pages 全局中间件：将 bangmio.pages.dev 重定向到 bangmio.site。
 *
 * 仅在 Host 为 pages.dev 子域名时触发 301 重定向，
 * 自定义域名（bangmio.site / www.bangmio.site）请求正常放行。
 */
export async function onRequest(ctx) {
  const host = ctx.request.headers.get('Host') || ''
  if (host.endsWith('.pages.dev')) {
    const url = new URL(ctx.request.url)
    url.hostname = 'bangmio.site'
    return Response.redirect(url.toString(), 301)
  }
  return ctx.next()
}
