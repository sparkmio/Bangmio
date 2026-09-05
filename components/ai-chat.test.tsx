import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
vi.mock('next/navigation', () => ({ usePathname: () => '/anime/42' }))
import { AiChat } from './ai-chat'
let container: HTMLDivElement, root: Root, main: HTMLElement
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() })
  localStorage.clear()
  window.history.replaceState({}, '', '/anime/42')
  main = document.createElement('main')
  main.innerHTML =
    '<h1>old public content</h1><section data-ai-private>private collection</section>'
  document.body.append(main)
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  main.remove()
  vi.unstubAllGlobals()
})
async function open() {
  await act(async () => root.render(<AiChat />))
  await act(async () =>
    (container.querySelector('[aria-label="打开 AI 助手"]') as HTMLButtonElement).click()
  )
}
async function send() {
  await act(async () =>
    (container.querySelector('.bm-ai-suggestions button') as HTMLButtonElement).click()
  )
  await act(async () =>
    container
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  )
}
describe('AI consent and freshness', () => {
  it('opening sends no request and default submission has no page context', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ data: { message: 'fixture' } }) })
    vi.stubGlobal('fetch', fetcher)
    await open()
    expect(fetcher).not.toHaveBeenCalled()
    await send()
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(JSON.parse(fetcher.mock.calls[0][1].body).context).toBe('')
  })
  it('only opted-in submissions capture fresh public DOM, excluding collections', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ data: { message: 'fixture' } }) })
    vi.stubGlobal('fetch', fetcher)
    await open()
    await act(async () =>
      (container.querySelector('input[type="checkbox"]') as HTMLInputElement).click()
    )
    main.querySelector('h1')!.textContent = 'new public content'
    await send()
    const context = JSON.parse(fetcher.mock.calls[0][1].body).context
    expect(context).toContain('new public content')
    expect(context).not.toContain('old public content')
    expect(context).not.toContain('private collection')
  })
})
