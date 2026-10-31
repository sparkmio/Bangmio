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
        degraded: true
      }
    )
  })

  it('returns an empty non-degraded result when an item has no linked rating IDs', async () => {
    const request = vi.fn()
    vi.stubGlobal('fetch', request)

    await expect(getOtherRatings({})).resolves.toEqual({
      data: { mal: null, imdb: null },
      degraded: false
    })
    expect(request).not.toHaveBeenCalled()
  })
})
