import { describe, expect, it } from 'vitest'
import {
  doubanSearchTitles,
  extractOtherRatingIds,
  externalSearchTitle,
  externalSearchTitles
} from './other-rating-ids'

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

describe('external rating search titles', () => {
  it('uses the canonical/original title instead of the Chinese display name', () => {
    expect(externalSearchTitle({ name: 'Steins;Gate', name_cn: '命运石之门' })).toBe('Steins;Gate')
  })

  it('prefers an explicit English or romanized title when available', () => {
    expect(
      externalSearchTitle({
        name: '鋼の錬金術師',
        name_cn: '钢之炼金术师',
        infobox: [{ key: '英文名', value: 'Fullmetal Alchemist' }]
      })
    ).toBe('Fullmetal Alchemist')
  })

  it('keeps multiple non-Chinese aliases for provider search', () => {
    expect(
      externalSearchTitles({
        name: '鋼の錬金術師',
        name_cn: '钢之炼金术师',
        name_en: 'Fullmetal Alchemist',
        infobox: [{ key: '罗马音', value: 'Hagane no Renkinjutsushi' }]
      })
    ).toEqual(['Fullmetal Alchemist', 'Hagane no Renkinjutsushi', '鋼の錬金術師'])
  })

  it('does not treat infobox URLs as searchable titles', () => {
    expect(
      externalSearchTitles({
        infobox: [
          {
            key: '英文名',
            value: { v: 'Fullmetal Alchemist', link: 'https://example.com/anime/1' }
          }
        ]
      })
    ).toEqual(['Fullmetal Alchemist'])
  })

  it('prioritizes the Chinese display name for Douban while retaining alternate titles', () => {
    expect(
      doubanSearchTitles({
        name: '鋼の錬金術師',
        name_cn: '钢之炼金术师',
        name_en: 'Fullmetal Alchemist'
      })
    ).toEqual(['钢之炼金术师', '鋼の錬金術師', 'Fullmetal Alchemist'])
  })

  it('does not fall back to the Chinese translation when no original title exists', () => {
    expect(externalSearchTitle({ name_cn: '命运石之门' })).toBe('')
  })
})
