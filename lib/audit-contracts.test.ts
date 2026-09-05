import { describe, expect, it } from 'vitest'
import { collectionOptions, formatEpisodeDuration } from './collection-options'
import { browseEndpoint, browseParams, parseBrowseQuery } from './browse-query'

describe('collection contracts', () => {
  it.each([0, 1, 2, 3, 4, 6])('preserves all five states for type %i', type => {
    expect(collectionOptions(type).map(item => item.value)).toEqual([1, 2, 3, 4, 5])
    expect(collectionOptions(type).find(item => item.label === '搁置')?.value).toBe(4)
    expect(collectionOptions(type).find(item => item.label === '抛弃')?.value).toBe(5)
  })
  it.each([
    [1425, '23:45'],
    [45, '00:45'],
    [3601, '1:00:01'],
    [0, '未知'],
    [-1, '未知'],
    [NaN, '未知']
  ])('formats seconds %s', (value, expected) => {
    expect(formatEpisodeDuration(Number(value))).toBe(expected)
  })
})
describe('search URL', () => {
  it('round trips keyword, page, type and tags', () => {
    const query = { keyword: '命运', type: 2, page: 3, tags: ['科幻', 'TV'] }
    expect(parseBrowseQuery(browseParams(query))).toEqual(query)
    const endpoint = new URL(browseEndpoint(query), 'http://localhost')
    expect(endpoint.pathname).toBe('/api/v1/anime/search')
    expect(endpoint.searchParams.get('tag')).toBe('科幻,TV')
  })
  it('normalizes malformed pages, types and repeated tags', () => {
    expect(parseBrowseQuery(new URLSearchParams('page=NaN&type=88&tag=TV,TV&tag=科幻'))).toEqual({
      keyword: '',
      page: 1,
      type: 0,
      tags: ['TV', '科幻']
    })
  })
})
