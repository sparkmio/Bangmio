const CACHE_TTL = 30 * 24 * 60 * 60 // 30 days

export const onRequest = async (ctx) => {
  const url = new URL(ctx.request.url)
  const upstream = `https://lain.bgm.tv${url.pathname}${url.search}`

  const cache = caches.default
  const cacheKey = new Request(upstream, { method: 'GET' })

  const match = await cache.match(cacheKey)
  if (match) {
    const resp = new Response(match.body, match)
    resp.headers.set('x-cache', 'HIT')
    resp.headers.set('Access-Control-Allow-Origin', '*')
    resp.headers.set('cache-control', `public, max-age=${CACHE_TTL}`)
    return resp
  }

  const upstreamResp = await fetch(upstream, {
    method: 'GET',
    headers: { 'User-Agent': 'Bangmio/anime-manager' },
    redirect: 'follow'
  })

  if (upstreamResp.ok) {
    const resp = new Response(upstreamResp.body, upstreamResp)
    resp.headers.set('x-cache', 'MISS')
    resp.headers.set('cache-control', `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL}`)
    resp.headers.set('Access-Control-Allow-Origin', '*')
    ctx.waitUntil(cache.put(cacheKey, resp.clone()))
    return resp
  }

  return upstreamResp
}
