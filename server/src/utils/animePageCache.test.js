import { expect, it, vi } from 'vitest'
import { serveCachedAnime } from './animePageCache.js'

function fixture() {
  const entries = new Map()
  const pending = []
  const cache = {
    match: async key => entries.get(key.url)?.clone(),
    put: vi.fn(async (key, response) => entries.set(key.url, response.clone()))
  }
  const ctx = { waitUntil: promise => pending.push(promise) }
  const request = (search = '', headers = {}) => new Request('https://bangmio.site/anime/1424' + search, {
    headers: { accept: 'text/html', ...headers }
  })
  const render = vi.fn(async () => new Response('<div data-bangmio-cache="public">K-ON!</div>', {
    headers: { 'content-type': 'text/html; charset=utf-8' }
  }))
  return { cache, ctx, pending, request, render }
}

it('only reuses anonymous HTML on the canonical detail route', async () => {
  const { cache, ctx, pending, request, render } = fixture()
  const fetch = req => serveCachedAnime(req, ctx, render, cache)
  expect((await fetch(request())).headers.get('X-Bangmio-Cache')).toBe('MISS')
  await Promise.all(pending)
  const hit = await fetch(request())
  expect(hit.headers.get('X-Bangmio-Cache')).toBe('HIT')
  expect(hit.headers.get('Cache-Control')).toBe('private, no-store')
  expect(await hit.text()).toContain('K-ON!')
  for (const req of [request('?tab=wiki'), request('', { cookie: 'session=fixture' }),
    request('', { authorization: 'Bearer fixture' }), request('', { rsc: '1' })]) {
    expect((await fetch(req)).headers.get('X-Bangmio-Cache')).toBeNull()
  }
  expect(cache.put).toHaveBeenCalledOnce()
  expect(render).toHaveBeenCalledTimes(5)
})

it('never caches degraded HTML or responses containing session cookies', async () => {
  const { cache, ctx, pending, request } = fixture()
  for (const [body, headers] of [
    ['<b data-bangmio-cache="public" data-bangmio-degraded="true">stale</b>', {}],
    ['<b data-bangmio-cache="public">private</b>', { 'set-cookie': 'session=fixture' }]
  ]) {
    await serveCachedAnime(request(), ctx, () => new Response(body, {
      headers: { 'content-type': 'text/html', ...headers }
    }), cache)
  }
  await Promise.all(pending)
  expect(cache.put).not.toHaveBeenCalled()
})
