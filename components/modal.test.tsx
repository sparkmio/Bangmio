import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Modal } from './modal'
let container: HTMLDivElement, root: Root
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true
  })
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false
  })
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})
it('opens a labelled native dialog, handles cancel and restores prior focus', async () => {
  const trigger = document.createElement('button')
  document.body.append(trigger)
  trigger.focus()
  const onClose = vi.fn()
  await act(async () =>
    root.render(
      <Modal title="章节信息" onClose={onClose}>
        <button>关闭</button>
      </Modal>
    )
  )
  const dialog = container.querySelector('dialog')!
  expect(dialog.open).toBe(true)
  expect(dialog.getAttribute('aria-label')).toBe('章节信息')
  await act(async () =>
    dialog.dispatchEvent(new Event('cancel', { bubbles: false, cancelable: true }))
  )
  expect(onClose).toHaveBeenCalledOnce()
  await act(async () => root.render(null))
  expect(document.activeElement).toBe(trigger)
  expect(HTMLDialogElement.prototype.close).toHaveBeenCalledOnce()
  trigger.remove()
})
