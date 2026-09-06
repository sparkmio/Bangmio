import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
const mocks = vi.hoisted(() => ({
  ready: true,
  authenticated: false,
  bound: false,
  request: vi.fn(),
  refresh: vi.fn()
}))
vi.mock('./auth-provider', () => ({
  useAuth: () => ({
    ready: mocks.ready,
    isAuthenticated: mocks.authenticated,
    isBound: mocks.bound,
    request: mocks.request
  })
}))
vi.mock('next/navigation', () => ({
  usePathname: () => '/anime/10380/topics',
  useSearchParams: () => new URLSearchParams('page=2'),
  useRouter: () => ({ push: vi.fn(), refresh: mocks.refresh })
}))
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}))
import { DiscussionComposer } from './discussion-composer'
let container: HTMLDivElement, root: Root
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  mocks.ready = true
  mocks.authenticated = false
  mocks.bound = false
  mocks.request.mockReset()
  mocks.refresh.mockReset()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})
async function render() {
  await act(async () => root.render(<DiscussionComposer subjectId={10380} mode="topic" />))
}
it('does not flash the guest CTA before authentication is ready', async () => {
  mocks.ready = false
  await render()
  expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  expect(container.querySelector('a')).toBeNull()
})
it('preserves the page and query in the login return path', async () => {
  await render()
  expect(container.querySelector('a')?.getAttribute('href')).toBe(
    '/login?redirect=%2Fanime%2F10380%2Ftopics%3Fpage%3D2'
  )
})
it('takes unbound accounts directly to the binding page', async () => {
  mocks.authenticated = true
  await render()
  expect(container.querySelector('a')?.getAttribute('href')).toBe('/bind-bangumi')
})
it('disables the editor while publishing and retains drafts after failure', async () => {
  mocks.authenticated = mocks.bound = true
  let reject!: (reason: Error) => void
  mocks.request.mockImplementation(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail
      })
  )
  await render()
  for (const [selector, value, proto] of [
    ['input', '测试话题', HTMLInputElement.prototype],
    ['textarea', '测试正文', HTMLTextAreaElement.prototype]
  ] as const) {
    const element = container.querySelector(selector)!
    await act(async () => {
      Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(element, value)
      element.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }
  await act(async () => {
    container
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  expect(container.querySelector('textarea')?.disabled).toBe(true)
  expect(mocks.request).toHaveBeenCalledTimes(1)
  await act(async () => {
    reject(new Error('服务暂时不可用'))
  })
  expect(container.querySelector('textarea')?.value).toBe('测试正文')
  expect(container.querySelector('input')?.value).toBe('测试话题')
  expect(container.querySelector('textarea')?.disabled).toBe(false)
  expect(container.querySelector('[role="status"]')?.textContent).toBe('服务暂时不可用')
  expect(mocks.refresh).not.toHaveBeenCalled()
})
