export type BrowseQuery = { page: number; type: number; keyword: string; tags: string[] }
export function parseBrowseQuery(params: URLSearchParams): BrowseQuery {
  const page = Number(params.get('page') || 1)
  const type = Number(params.get('type') || 0)
  return {
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    type: [0, 1, 2, 3, 4, 6].includes(type) ? type : 0,
    keyword: (params.get('keyword') || '').trim(),
    tags: [
      ...new Set(
        params
          .getAll('tag')
          .flatMap(tag => tag.split(','))
          .map(tag => tag.trim())
          .filter(Boolean)
      )
    ]
  }
}
export function browseParams(query: BrowseQuery) {
  const params = new URLSearchParams({ page: String(query.page), type: String(query.type) })
  if (query.keyword) params.set('keyword', query.keyword)
  query.tags.forEach(tag => params.append('tag', tag))
  return params
}
export function browseEndpoint(query: BrowseQuery) {
  const params = browseParams(query)
  params.set('limit', '20')
  params.delete('tag')
  if (query.tags.length) params.set('tag', query.tags.join(','))
  if (!query.keyword) params.set('sort', 'heat')
  return `/api/v1/anime/${query.keyword ? 'search' : 'browse'}?${params}`
}
