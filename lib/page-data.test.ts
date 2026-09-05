import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  }
}))
vi.mock('./api', () => ({ apiFetch: vi.fn() }))
import { apiFetch } from './api'
import { requiredPageData, requirePositiveId } from './page-data'
beforeEach(() => vi.resetAllMocks())
describe('required page contract', () => {
  it('distinguishes an upstream outage from a missing resource', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(Object.assign(new Error('outage'), { status: 502 }))
    await expect(requiredPageData('/fixture')).rejects.toThrow('outage')
    vi.mocked(apiFetch).mockRejectedValueOnce(Object.assign(new Error('missing'), { status: 404 }))
    await expect(requiredPageData('/fixture')).rejects.toThrow('NEXT_NOT_FOUND')
  })
  it('does not turn malformed data into a missing page', async () => {
    vi.mocked(apiFetch).mockResolvedValue({})
    await expect(requiredPageData('/fixture')).rejects.toThrow('页面资料返回异常')
  })
  it.each(['0', '-1', '1/2', 'abc', '9007199254740992'])('rejects invalid id %s', id => {
    expect(() => requirePositiveId(id)).toThrow('NEXT_NOT_FOUND')
    expect(apiFetch).not.toHaveBeenCalled()
  })
})
