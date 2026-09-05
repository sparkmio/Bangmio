import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { EpisodeList } from './episode-list'
let container: HTMLDivElement, root: Root
const episodes = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1,
  sort: i + 1,
  name: `章节-${i + 1}`
}))
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  if (!AbortSignal.any)
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => new AbortController().signal)
  if (!AbortSignal.any)
    Object.defineProperty(AbortSignal, 'any', {
      configurable: true,
      value: (signals: AbortSignal[]) => signals[0]
    })
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
const click = async (text: string) => {
  await act(async () => {
    const button = [...container.querySelectorAll('button')].find(item => item.textContent === text)
    expect(button).toBeTruthy()
    button!.click()
  })
}
describe('episode pagination', () => {
  it('loads chapter 101 and can return to the first page', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 101, sort: 101, name: '章节-101' }], total: 101 })
    })
    vi.stubGlobal('fetch', fetcher)
    await act(async () =>
      root.render(<EpisodeList subjectId={9} initialEpisodes={episodes} initialTotal={101} />)
    )
    await click('下一页章节')
    expect(fetcher.mock.calls[0][0]).toContain('offset=100&limit=100')
    expect(container.textContent).toContain('章节-101')
    expect(container.textContent).not.toContain('章节-99')
    await click('上一页章节')
    expect(container.textContent).toContain('章节-99')
  })
  it('shows initial upstream failure as retry, not empty data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ name: '恢复章节' }], total: 1 })
      })
    )
    await act(async () =>
      root.render(<EpisodeList subjectId={9} initialEpisodes={[]} initialTotal={0} initialFailed />)
    )
    expect(container.textContent).toContain('章节加载失败')
    expect(container.textContent).not.toContain('暂无章节')
    await click('重试章节')
    expect(container.textContent).toContain('恢复章节')
  })
})
