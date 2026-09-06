import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
const auth = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('./auth-provider', () => ({
  useAuth: () => ({ ready: true, isAuthenticated: true, request: auth.request })
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>
}))
import { CollectionEditor } from './collection-button'
let container: HTMLDivElement, root: Root
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  auth.request.mockReset()
  auth.request.mockResolvedValue({ data: { type: 3, ep_status: 105, rate: 7 } })
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})
describe('collection editor long-series regression', () => {
  it('keeps ten distinct rating choices and bounds the progress grid with navigation', async () => {
    await act(async () =>
      root.render(<CollectionEditor animeId={42} subjectType={1} totalEpisodes={1200} />)
    )
    expect(container.querySelectorAll('[role="radio"]')).toHaveLength(10)
    expect(container.querySelectorAll('.bm-watch-progress-episodes button')).toHaveLength(100)
    expect(container.textContent).toContain('在读')
    expect(container.querySelector('[aria-label="标记看到第 101 集"]')).toBeTruthy()
    const select = container.querySelector('[aria-label="进度页"]') as HTMLSelectElement
    await act(async () => {
      select.value = '11'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(container.querySelector('[aria-label="标记看到第 1200 集"]')).toBeTruthy()
    expect(auth.request.mock.calls.every(call => !call[1]?.method)).toBe(true)
  })
})

it('blocks edits after a read error and restores existing values on retry with only one read per attempt', async () => {
  auth.request.mockRejectedValueOnce(new Error('unavailable'))
  await act(async () => root.render(<CollectionEditor animeId={42} totalEpisodes={1200} />))
  expect(container.textContent).toContain('收藏记录读取失败')
  expect(container.querySelector('textarea')).toBeNull()
  auth.request.mockResolvedValueOnce({
    data: { type: 3, rate: 8, comment: '原有短评', ep_status: 10 }
  })
  await act(async () => (container.querySelector('button') as HTMLButtonElement).click())
  expect((container.querySelector('textarea') as HTMLTextAreaElement).value).toBe('原有短评')
  expect(container.querySelector('[aria-label="8 分"]')?.getAttribute('aria-checked')).toBe('true')
  expect(auth.request).toHaveBeenCalledTimes(2)
  expect(auth.request.mock.calls.every(call => !call[1]?.method)).toBe(true)
})
it('does not render editable default values while a read is pending', async () => {
  auth.request.mockReturnValue(new Promise(() => {}))
  await act(async () => root.render(<CollectionEditor animeId={42} />))
  expect(container.textContent).toContain('正在读取收藏记录')
  expect(container.querySelector('textarea')).toBeNull()
})
it('resets editor state when navigating to an uncollected subject', async () => {
  auth.request.mockResolvedValueOnce({ data: { type: 3, rate: 8, comment: '旧条目短评' } })
  await act(async () => root.render(<CollectionEditor animeId={42} />))
  auth.request.mockResolvedValueOnce({ data: null })
  await act(async () => root.render(<CollectionEditor animeId={43} />))
  expect((container.querySelector('textarea') as HTMLTextAreaElement).value).toBe('')
  expect((container.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(
    true
  )
  expect(container.textContent).toContain('请先选择收藏状态')
})
it('does not let an old subject response overwrite the current subject', async () => {
  let resolveOld!: (value: unknown) => void
  auth.request.mockReturnValueOnce(
    new Promise(resolve => {
      resolveOld = resolve
    })
  )
  await act(async () => root.render(<CollectionEditor animeId={42} />))
  auth.request.mockResolvedValueOnce({ data: { type: 1, comment: '新条目' } })
  await act(async () => root.render(<CollectionEditor animeId={43} />))
  await act(async () => resolveOld({ data: { type: 3, comment: '过期内容' } }))
  expect((container.querySelector('textarea') as HTMLTextAreaElement).value).toBe('新条目')
})

it('locks details while the collection status write is pending', async () => {
  await act(async () => root.render(<CollectionEditor animeId={42} />))
  let resolveWrite!: (value: unknown) => void
  auth.request.mockReturnValueOnce(
    new Promise(resolve => {
      resolveWrite = resolve
    })
  )
  await act(async () =>
    (container.querySelector('.bm-collection-status-button') as HTMLButtonElement).click()
  )
  const option = [...container.querySelectorAll('.bm-collection-menu button')].find(
    button => button.textContent === '看过'
  ) as HTMLButtonElement
  await act(async () => option.click())
  expect((container.querySelector('textarea') as HTMLTextAreaElement).disabled).toBe(true)
  expect((container.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(
    true
  )
  await act(async () => resolveWrite({ data: { type: 2 } }))
  expect((container.querySelector('textarea') as HTMLTextAreaElement).disabled).toBe(false)
})
it('keeps watching progress outside the collection card while retaining the privacy boundary', async () => {
  await act(async () => root.render(<CollectionEditor animeId={42} totalEpisodes={1200} />))
  const editor = container.querySelector('.bm-collection-editor')!
  const progress = container.querySelector('.bm-watch-progress-card')!
  expect(editor.contains(progress)).toBe(false)
  expect(editor.parentElement).toBe(progress.parentElement)
  expect(progress.getAttribute('data-ai-private')).toBe('true')
})
