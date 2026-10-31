import { describe, expect, it } from 'vitest'
import { extractOtherRatingIds } from './other-rating-ids'

describe('external rating ID extraction', () => {
  it('extracts only explicit MAL and IMDb IDs from infobox links', () => {
    expect(
      extractOtherRatingIds([
        {
          key: 'MyAnimeList',
          value: { v: '命运石之门', link: 'https://myanimelist.net/anime/9253' }
        },
        { key: 'IMDb', value: 'https://www.imdb.com/title/tt2013206/' }
      ])
    ).toEqual({ malId: '9253', imdbId: 'tt2013206' })
  })

  it('accepts numeric MAL IDs but never guesses an ID from a title', () => {
    expect(
      extractOtherRatingIds([
        { key: 'MAL ID', value: 9253 },
        { key: 'IMDb', value: 'Steins;Gate' }
      ])
    ).toEqual({ malId: '9253', imdbId: '' })
  })

  it('ignores unrelated numeric and IMDb-like fields', () => {
    expect(
      extractOtherRatingIds([
        { key: '话数', value: '25' },
        { key: '官方网站', value: 'https://example.com/tt1234567' }
      ])
    ).toEqual({ malId: '', imdbId: '' })
  })
})
