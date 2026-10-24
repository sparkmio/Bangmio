import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('../services/bangumi.js', () => ({
  searchAnime: vi.fn(),
  browseAnime: vi.fn(),
  getAnimeDetail: vi.fn()
}))
vi.mock('../utils/logger.js', () => ({ logError: vi.fn() }))
import * as service from '../services/bangumi.js'
import { logError } from '../utils/logger.js'
import { searchAnime, browseAnime, getAnimeDetail } from './animeController.js'
function context(query = {}) {
  return {
    req: {
      query: key => (key ? query[key] : query),
      param: () => '42',
      path: '/api/v1/anime/browse'
    },
    env: {},
    json: (body, status = 200) => ({ body, status })
  }
}
beforeEach(() => vi.clearAllMocks())
describe('anime controller regression', () => {
  it('forwards keyword, type and tags together', async () => {
    service.searchAnime.mockResolvedValue({ data: [], total: 0 })
    expect(
      (await searchAnime(context({ keyword: 'test', type: '2', tag: '科幻,原创' }))).status
    ).toBe(200)
    expect(service.searchAnime).toHaveBeenCalledWith(
      'test',
      expect.objectContaining({ type: 2, tag: '科幻,原创' })
    )
  })
  it('forwards home browse filters', async () => {
    service.browseAnime.mockResolvedValue({ data: [], total: 0 })

    expect((await browseAnime(context({ sort: 'heat', type: '2', limit: '12' }))).status).toBe(200)
    expect(service.browseAnime).toHaveBeenCalledWith({
      isChina: false,
      sort: 'heat',
      type: '2',
      limit: '12'
    })
  })
  it('returns 502 and logs diagnostics when the upstream browse request fails', async () => {
    const error = new TypeError('fetch failed', { cause: new Error('read ECONNRESET') })
    service.browseAnime.mockRejectedValue(error)

    const response = await browseAnime(context({ sort: 'heat', type: '2', limit: '12' }))

    expect(response).toEqual({ body: { error: '浏览失败' }, status: 502 })
    expect(logError).toHaveBeenCalledWith(
      '番剧浏览失败',
      expect.objectContaining({
        path: '/api/v1/anime/browse',
        errorName: 'TypeError',
        message: 'fetch failed',
        causeName: 'Error',
        causeMessage: 'read ECONNRESET'
      })
    )
  })
  it.each([
    [404, 404],
    [500, 502],
    [429, 502]
  ])('maps upstream %i to %i', async (upstream, expected) => {
    service.getAnimeDetail.mockRejectedValue({ response: { status: upstream } })
    expect((await getAnimeDetail(context())).status).toBe(expected)
  })
  it('maps connection failure to recoverable 502', async () => {
    service.getAnimeDetail.mockRejectedValue(new Error('network'))
    expect((await getAnimeDetail(context())).status).toBe(502)
  })
})
