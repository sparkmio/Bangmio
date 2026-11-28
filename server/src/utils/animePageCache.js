const HTML_TTL = 300
const NOT_FOUND_TTL = 60
const BYPASS_HEADERS = [
  'cookie', 'authorization', 'x-bangumi-username', 'rsc', 'next-router-state-tree',
  'next-router-prefetch', 'next-router-segment-prefetch', 'next-url', 'range'
]

export async function serveCachedAnime(request, ctx, render, cache = globalThis.caches?.default) {
  const url = new URL(request.url)
  if (
    !cache ||
    request.method !== 'GET' ||
    url.search ||
    !/^\/anime\/[1-9]\d*$/.test(url.pathname) ||
    !request.headers.get('accept')?.includes('text/html') ||
    BYPASS_HEADERS.some(name => request.headers.has(name))
  ) return render()

  // Bump this namespace when changing cached HTML or cache eligibility.
  const key = new Request(new URL('/_bangmio-cache/html-v1' + url.pathname, url.origin))
  const hit = await cache.match(key).catch(() => null)
  if (hit) {
    const response = new Response(hit.body, hit)
    response.headers.set('Cache-Control', 'private, no-store')
    response.headers.set('X-Bangmio-Cache', 'HIT')
    return response
  }
  const rendered = await render()
  const response = new Response(rendered.body, rendered)
  response.headers.set('X-Bangmio-Cache', 'MISS')
  if (
    (response.status === 200 || response.status === 404) &&
    response.headers.get('content-type')?.startsWith('text/html') &&
    !response.headers.has('set-cookie') &&
    !response.headers.has('content-encoding') &&
    !response.headers.has('location')
  ) {
    ctx.waitUntil((async () => {
      const copy = response.clone()
      const html = await copy.text()
      // A successful page opts in explicitly since a streamed error can carry HTTP 200.
      if (response.status === 200 && !html.includes('data-bangmio-cache="public"')) return
      if (html.includes('data-bangmio-degraded="true"')) return
      copy.headers.delete('Vary')
      copy.headers.delete('Content-Length')
      copy.headers.set('Cache-Control', `public, max-age=${response.status === 404 ? NOT_FOUND_TTL : HTML_TTL}`)
      await cache.put(key, new Response(html, { status: response.status, headers: copy.headers }))
    })().catch(() => {}))
  }
  return response
}
