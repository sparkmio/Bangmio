import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/otherRatings.js', () => ({ getOtherRatings: vi.fn() }))

import { getOtherRatings } from '../services/otherRatings.js'
import app from './ratings.js'

beforeEach(() => vi.clearAllMocks())

describe('other ratings route', () => {
  it('validates explicit provider IDs before calling the service', async () => {
    const response = await app.request('/other?mal_id=../1', {}, {})

    expect(response.status).toBe(400)
    expect(getOtherRatings).not.toHaveBeenCalled()
  })

  it('returns partial provider data without making one source depend on another', async () => {
    vi.mocked(getOtherRatings).mockResolvedValue({
      data: { mal: { score: 8.5 }, imdb: null },
      degraded: true
    })

    const response = await app.request('/other?mal_id=9253&imdb_id=tt2013206', {}, {})

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: { mal: { score: 8.5 }, imdb: null },
      degraded: true
    })
    expect(getOtherRatings).toHaveBeenCalledWith({
      malId: '9253',
      imdbId: 'tt2013206',
      titles: [],
      year: ''
    })
  })

  it('passes bounded alternate titles and release year for automatic matching', async () => {
    const response = await app.request(
      '/other?title=Fullmetal%20Alchemist&title=Hagane%20no%20Renkinjutsushi&year=2003',
      {},
      {}
    )

    expect(response.status).toBe(200)
    expect(getOtherRatings).toHaveBeenCalledWith({
      malId: '',
      imdbId: '',
      titles: ['Fullmetal Alchemist', 'Hagane no Renkinjutsushi'],
      year: '2003'
    })
  })

  it('rejects malformed years', async () => {
    const response = await app.request('/other?year=2003-01-01', {}, {})

    expect(response.status).toBe(400)
    expect(getOtherRatings).not.toHaveBeenCalled()
  })
})
