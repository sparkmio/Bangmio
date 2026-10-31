import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  }
}))
vi.mock('@/lib/api', () => ({
  displayName: () => 'fixture',
  imageUrl: () => ''
}))
vi.mock('@/lib/api-server', () => ({ apiFetchServer: vi.fn(), safeApiFetchServer: vi.fn() }))
vi.mock('@/components/anime-detail', () => ({ AnimeDetail: () => null }))
import { apiFetchServer, safeApiFetchServer } from '@/lib/api-server'
import Page from './page'
beforeEach(() => {
  vi.mocked(safeApiFetchServer).mockResolvedValue({ data: [] })
})
afterEach(() => vi.resetAllMocks())
describe('detail failure boundaries', () => {
  it('uses not found only for upstream 404', async () => {
    vi.mocked(apiFetchServer).mockRejectedValue(
      Object.assign(new Error('missing'), { status: 404 })
    )
    await expect(Page({ params: Promise.resolve({ id: '42' }) })).rejects.toThrow('NEXT_NOT_FOUND')
  })
  it('propagates an upstream outage to retry boundary', async () => {
    vi.mocked(apiFetchServer).mockRejectedValue(
      Object.assign(new Error('upstream outage'), { status: 502 })
    )
    await expect(Page({ params: Promise.resolve({ id: '42' }) })).rejects.toThrow('upstream outage')
  })
  it('rejects malformed IDs without a request', async () => {
    await expect(Page({ params: Promise.resolve({ id: 'abc' }) })).rejects.toThrow('NEXT_NOT_FOUND')
    expect(apiFetchServer).not.toHaveBeenCalled()
  })
  it('keeps supplementary chapter failure explicit', async () => {
    vi.mocked(apiFetchServer).mockResolvedValue({ data: { id: 42, name: 'fixture' } })
    vi.mocked(safeApiFetchServer).mockResolvedValue(null)
    const result = await Page({ params: Promise.resolve({ id: '42' }) })
    expect(result.props.episodesFailed).toBe(true)
  })
})
