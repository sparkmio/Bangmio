import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
const auth = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('./auth-provider', () => ({
  useAuth: () => ({ isAuthenticated: true, request: auth.request })
}))
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}))
vi.mock('./anime-card', () => ({ AnimeGrid: () => null }))
import { HomeClient } from './home-client'
let container: HTMLDivElement, root: Root
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
  }
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  auth.request.mockReset()
  auth.request.mockImplementation(async (url: string) =>
    url.includes('/collection/list')
      ? {
          data: [
            {
              subject_id: 42,
              subject_type: 1,
              type: 3,
              subject: { id: 42, name: 'fixture book', eps: 120 }
            }
          ]
        }
      : { data: [{ sort: 1, name: 'fixture chapter', duration_seconds: 1425 }] }
  )
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }))
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})
describe('home watching contracts', () => {
  it('requests watching only, links long series, and labels full-subject state using subject type', async () => {
    await act(async () => root.render(<HomeClient initialHot={[]} />))
    expect(auth.request.mock.calls[0][0]).toContain('type=3')
    expect(container.textContent).toContain('查看全部 120 集')
    const button = [...container.querySelectorAll('button')].find(el => el.textContent === '01')
    expect(button).toBeTruthy()
    await act(async () => button!.click())
    expect(container.textContent).toContain('整部作品的收藏状态（不是本集进度）')
    expect(container.textContent).toContain('搁置')
    expect(container.textContent).toContain('抛弃')
    expect(container.textContent).toContain('在读')
    expect(container.textContent).toContain('23:45')
    expect(container.textContent).not.toContain('23:45:00')
  })
})
