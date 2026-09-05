import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('../services/bangumi.js', () => ({ searchAnime: vi.fn(), getAnimeDetail: vi.fn() }))
import * as service from '../services/bangumi.js'
import { searchAnime, getAnimeDetail } from './animeController.js'
function context(query = {}) {
  return {
    req: { query: key => (key ? query[key] : query), param: () => '42' },
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
