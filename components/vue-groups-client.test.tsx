import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  api: vi.fn(),
  user: null as null | { username: string }
}))
vi.mock('./auth-provider', () => ({
  useAuth: () => ({ user: mocks.user, request: mocks.request })
}))
vi.mock('@/lib/api', () => ({ apiFetch: mocks.api }))
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}))
import { VueGroupsClient } from './vue-groups-client'
let container: HTMLDivElement, root: Root
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.useFakeTimers()
  mocks.user = null
  mocks.request.mockReset()
  mocks.api.mockReset()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.useRealTimers()
})
async function render() {
  await act(async () => root.render(<VueGroupsClient initialGroups={[]} initialTopics={[]} />))
}
async function query(value: string) {
  const input = container.querySelector('input')!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => {
    vi.advanceTimersByTime(310)
  })
}
it('ignores a slow old search and cancels it when the query changes', async () => {
  let resolveOld!: (value: unknown) => void
  mocks.api.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        resolveOld = resolve
      })
  )
  mocks.api.mockResolvedValueOnce({ data: [{ id: 'new', name: '新的结果' }] })
  await render()
  await query('old')
  await query('new')
  expect(mocks.api.mock.calls[0][1].signal.aborted).toBe(true)
  expect(container.textContent).toContain('新的结果')
  await act(async () => resolveOld({ data: [{ id: 'old', name: '过期结果' }] }))
  expect(container.textContent).not.toContain('过期结果')
  expect(container.textContent).toContain('新的结果')
  await query('')
  expect(container.textContent).toContain('正在讨论')
})
it('uses one followed-list read without N+1 detail requests', async () => {
  mocks.user = { username: 'fixture' }
  mocks.request.mockResolvedValue({
    data: [
      { id: 'one', name: '我的小组' },
      { id: 'two', name: '第二个小组' }
    ]
  })
  await render()
  expect(mocks.request).toHaveBeenCalledTimes(1)
  expect(container.textContent).toContain('我的小组')
})
it('does not misrepresent a failed followed read as an empty membership list', async () => {
  mocks.user = { username: 'fixture' }
  mocks.request.mockRejectedValue(new Error('offline'))
  await render()
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('读取失败')
  expect(container.textContent).not.toContain('还没有关注的小组')
})
it('discards followed data after logout', async () => {
  let resolve!: (value: unknown) => void
  mocks.user = { username: 'fixture' }
  mocks.request.mockReturnValue(
    new Promise(done => {
      resolve = done
    })
  )
  await render()
  mocks.user = null
  await render()
  await act(async () => resolve({ data: [{ id: 'private', name: '旧账号的小组' }] }))
  expect(container.textContent).not.toContain('旧账号的小组')
  expect(container.textContent).toContain('登录后查看')
})
