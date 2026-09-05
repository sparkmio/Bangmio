import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  }
}))
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
  safeApiFetch: vi.fn(),
  displayName: () => 'fixture',
  imageUrl: () => ''
}))
vi.mock('@/components/vue-anime-detail', () => ({ VueAnimeDetail: () => null }))
import { apiFetch, safeApiFetch } from '@/lib/api'
import Page from './page'
beforeEach(() => {
  vi.mocked(safeApiFetch).mockResolvedValue({ data: [] })
})
afterEach(() => vi.resetAllMocks())
describe('detail failure boundaries', () => {
  it('uses not found only for upstream 404', async () => {
    vi.mocked(apiFetch).mockRejectedValue(Object.assign(new Error('missing'), { status: 404 }))
    await expect(Page({ params: Promise.resolve({ id: '42' }) })).rejects.toThrow('NEXT_NOT_FOUND')
  })
  it('propagates an upstream outage to retry boundary', async () => {
    vi.mocked(apiFetch).mockRejectedValue(
      Object.assign(new Error('upstream outage'), { status: 502 })
    )
    await expect(Page({ params: Promise.resolve({ id: '42' }) })).rejects.toThrow('upstream outage')
  })
  it('rejects malformed IDs without a request', async () => {
    await expect(Page({ params: Promise.resolve({ id: 'abc' }) })).rejects.toThrow('NEXT_NOT_FOUND')
    expect(apiFetch).not.toHaveBeenCalled()
  })
  it('keeps supplementary chapter failure explicit', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ data: { id: 42, name: 'fixture' } })
    vi.mocked(safeApiFetch).mockResolvedValue(null)
    const result = await Page({ params: Promise.resolve({ id: '42' }) })
    expect(result.props.episodesFailed).toBe(true)
  })
})
