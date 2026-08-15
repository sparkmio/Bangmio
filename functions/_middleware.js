/**
 * CF Pages 全局中间件：将 bangmio.pages.dev 重定向到 bangmio.site。
 *
 * pages.dev 与 www.bangmio.site 统一重定向到 bangmio.site，
 * 避免 OAuth state cookie 因跨主机回调而丢失。
 */
export async function onRequest(ctx) {
  const host = ctx.request.headers.get('Host') || ''
  if (host.endsWith('.pages.dev') || host === 'www.bangmio.site') {
    const url = new URL(ctx.request.url)
    url.hostname = 'bangmio.site'
    return Response.redirect(url.toString(), 301)
  }
  return ctx.next()
}
