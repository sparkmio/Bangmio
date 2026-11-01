import { afterEach, describe, expect, it, vi } from 'vitest'
import { getOtherRatings } from './otherRatings.js'

afterEach(() => vi.unstubAllGlobals())

describe('other platform ratings', () => {
  it('reads MAL score and vote count through the matching MAL ID', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          data: { score: 8.7, scored_by: 12345, url: 'https://myanimelist.net/anime/900001' }
        })
      )
    )

    await expect(getOtherRatings({ malId: '900001' })).resolves.toMatchObject({
      data: { mal: { id: '900001', score: 8.7, votes: 12345 } },
      degraded: false,
      degradedSources: { mal: false, imdb: false }
    })
  })

  it('resolves a MAL entry by exact English/original title and prefers the matching year', async () => {
    const fetch = vi.fn(async url => {
      if (String(url).includes('api.jikan.moe'))
        return Response.json({
          data: [
            {
              mal_id: 990001,
              title: 'Fullmetal Alchemist: Brotherhood',
              title_english: 'Fullmetal Alchemist: Brotherhood',
              year: 2009,
              score: 9.1,
              scored_by: 200000
            },
            {
              mal_id: 990002,
              title: '鋼の錬金術師',
              title_english: 'Fullmetal Alchemist',
              year: 2003,
              score: 8.2,
              scored_by: 100000,
              url: 'https://myanimelist.net/anime/990002'
            }
          ]
        })
      return new Response('<html>No IMDb results</html>', {
        headers: { 'content-type': 'text/html' }
      })
    })
    vi.stubGlobal('fetch', fetch)

    await expect(
      getOtherRatings({ titles: ['Fullmetal Alchemist', '鋼の錬金術師'], year: '2003' })
    ).resolves.toMatchObject({
      data: { mal: { id: '990002', score: 8.2, votes: 100000 } },
      degraded: false
    })
    expect(String(fetch.mock.calls[0][0])).toContain('q=Fullmetal+Alchemist')
  })

  it('falls back to title matching when a linked MAL ID is stale', async () => {
    const fetch = vi.fn(async url => {
      const value = String(url)
      if (value.includes('/v4/anime/900003')) return new Response('not found', { status: 404 })
      if (value.includes('api.jikan.moe'))
        return Response.json({
          data: [
            {
              mal_id: 990003,
              title: 'Fallback Anime',
              title_english: 'Fallback Anime',
              score: 7.9,
              scored_by: 1000
            }
          ]
        })
      return new Response('<html>No IMDb results</html>', {
        headers: { 'content-type': 'text/html' }
      })
    })
    vi.stubGlobal('fetch', fetch)

    await expect(
      getOtherRatings({ malId: '900003', titles: ['Fallback Anime'] })
    ).resolves.toMatchObject({
      data: { mal: { id: '990003', score: 7.9, votes: 1000 } },
      degradedSources: { mal: false }
    })
  })

  it('resolves IMDb ratings through an exact title result when no IMDb ID is linked', async () => {
    const fetch = vi.fn(async url => {
      const value = String(url)
      if (value.includes('api.jikan.moe')) return Response.json({ data: [] })
      if (value.includes('/find/'))
        return new Response(
          '<a href="/title/tt0120737/">The Lord of the Rings: The Fellowship of the Ring</a>',
          { headers: { 'content-type': 'text/html' } }
        )
      if (value.includes('/title/tt0120737/'))
        return new Response(
          '<script type="application/ld+json">{"@type":"TVSeries","name":"The Lord of the Rings: The Fellowship of the Ring","aggregateRating":{"@type":"AggregateRating","ratingValue":"8.8","ratingCount":"2,100,000"}}</script>'
        )
      return new Response('unexpected request', { status: 500 })
    })
    vi.stubGlobal('fetch', fetch)

    await expect(
      getOtherRatings({ titles: ['The Lord of the Rings: The Fellowship of the Ring'] })
    ).resolves.toMatchObject({
      data: { imdb: { id: 'tt0120737', score: 8.8, votes: 2100000 } },
      degraded: false
    })
  })

  it('parses IMDb AggregateRating from JSON-LD and keeps providers independent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async url => {
        if (String(url).includes('imdb.com'))
          return new Response(
            '<script type="application/ld+json">{"@type":"TVSeries","aggregateRating":{"@type":"AggregateRating","ratingValue":"8.4","ratingCount":"67,890"}}</script>'
          )
        return new Response('unavailable', { status: 503 })
      })
    )

    await expect(getOtherRatings({ malId: '900002', imdbId: 'tt99999991' })).resolves.toMatchObject(
      {
        data: { mal: null, imdb: { id: 'tt99999991', score: 8.4, votes: 67890 } },
        degraded: true,
        degradedSources: { mal: true, imdb: false }
      }
    )
  })

  it('returns an empty non-degraded result when an item has no linked rating IDs', async () => {
    const request = vi.fn()
    vi.stubGlobal('fetch', request)

    await expect(getOtherRatings({})).resolves.toEqual({
      data: { mal: null, imdb: null },
      degraded: false,
      degradedSources: { mal: false, imdb: false }
    })
    expect(request).not.toHaveBeenCalled()
  })
})
