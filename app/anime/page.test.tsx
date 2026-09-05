import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
const nav = vi.hoisted(() => ({ query: 'type=2&keyword=test&tag=科幻', push: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: nav.push }),
  useSearchParams: () => new URLSearchParams(nav.query)
}))
vi.mock('@/components/anime-card', () => ({
  AnimeGrid: ({ subjects }: { subjects: { name: string }[] }) => (
    <div>{JSON.stringify(subjects)}</div>
  )
}))
vi.mock('@/components/vue-loading-state', () => ({ VueLoadingState: () => <p>loading</p> }))
import Page from './page'
let container: HTMLDivElement, root: Root
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  if (!AbortSignal.any)
    Object.defineProperty(AbortSignal, 'any', {
      configurable: true,
      value: (signals: AbortSignal[]) => signals[0]
    })
  nav.query = 'type=2&keyword=test&tag=科幻'
  nav.push.mockClear()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})
const result = (name: string) => ({
  ok: true,
  json: async () => ({ data: [{ id: 1, name }], total: 1 })
})
describe('browse URL and request lifecycle', () => {
  it('combines search with tags and preserves them in navigation', async () => {
    const fetcher = vi.fn().mockResolvedValue(result('fixture'))
    vi.stubGlobal('fetch', fetcher)
    await act(async () => root.render(<Page />))
    const endpoint = fetcher.mock.calls.find(call => String(call[0]).includes('/search?'))![0]
    expect(new URL(endpoint, 'http://local').searchParams.get('tag')).toBe('科幻')
    await act(async () =>
      container
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    )
    const url = nav.push.mock.calls[0][0]
    expect(new URL(url, 'http://local').searchParams.get('keyword')).toBe('test')
    expect(new URL(url, 'http://local').searchParams.get('tag')).toBe('科幻')
  })
  it('ignores a stale response after URL changes even when fetch ignores cancellation', async () => {
    let resolveOld!: (value: ReturnType<typeof result>) => void
    const fetcher = vi.fn((url: string) =>
      url.includes('/tags')
        ? Promise.resolve(result('tag'))
        : url.includes('keyword=test')
          ? new Promise(resolve => {
              resolveOld = resolve
            })
          : Promise.resolve(result('new-result'))
    )
    vi.stubGlobal('fetch', fetcher)
    await act(async () => root.render(<Page />))
    const oldSignal = fetcher.mock.calls.find(call => call[0].includes('/search?'))
    expect(oldSignal).toBeTruthy()
    nav.query = 'type=2&keyword=new'
    await act(async () => root.render(<Page />))
    expect(container.textContent).toContain('new-result')
    await act(async () => resolveOld(result('old-result')))
    expect(container.textContent).toContain('new-result')
    expect(container.textContent).not.toContain('old-result')
  })
})
