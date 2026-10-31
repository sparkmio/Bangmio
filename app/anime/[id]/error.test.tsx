import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { animeDetailRetryKey } from '@/lib/anime-detail-recovery'

vi.mock('next/navigation', () => ({ usePathname: () => '/anime/10380' }))
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}))

import AnimeDetailError from './error'

let container: HTMLDivElement
let root: Root
const reset = vi.fn()

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.useFakeTimers()
  sessionStorage.clear()
  reset.mockReset()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.useRealTimers()
})

it('automatically attempts one recovery and stops repeat boundary mounts', async () => {
  await act(async () =>
    root.render(<AnimeDetailError error={new Error('offline')} reset={reset} />)
  )
  await act(async () => vi.advanceTimersByTimeAsync(251))
  expect(reset).toHaveBeenCalledOnce()
  expect(sessionStorage.getItem(animeDetailRetryKey('10380'))).not.toBeNull()

  await act(async () => root.unmount())
  root = createRoot(container)
  await act(async () =>
    root.render(<AnimeDetailError error={new Error('offline')} reset={reset} />)
  )
  await act(async () => vi.advanceTimersByTimeAsync(251))

  expect(reset).toHaveBeenCalledOnce()
  expect(container.textContent).toContain('番剧 10380 暂时无法加载')
  expect(document.title).toBe('番剧 10380 · Bangmio')
})
