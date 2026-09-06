import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ReplyAction } from './reply-action'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

it('dispatches a reply target and scrolls to the composer', async () => {
  const target = document.createElement('div')
  target.id = 'reply-composer'
  target.scrollIntoView = vi.fn()
  document.body.append(target)
  const listener = vi.fn()
  window.addEventListener('bangmio:reply-target', listener)

  await act(async () => root.render(<ReplyAction author="小明" floor="2-1" />))
  await act(async () => {
    container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  expect(listener).toHaveBeenCalledTimes(1)
  expect(listener.mock.calls[0][0]).toMatchObject({ detail: { author: '小明', floor: '2-1' } })
  expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })

  window.removeEventListener('bangmio:reply-target', listener)
  target.remove()
})
