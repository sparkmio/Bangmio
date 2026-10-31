import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  ANNOUNCEMENT_DISMISSED_KEY,
  ANNOUNCEMENT_URL,
  AnnouncementPopup
} from './announcement-popup'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
  }
  localStorage.clear()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.useRealTimers()
})

it('opens on a new visit and displays the live announcement inline', async () => {
  await act(async () => root.render(<AnnouncementPopup />))

  expect(container.querySelector('dialog')?.open).toBe(true)
  const frame = container.querySelector('iframe')
  expect(frame?.getAttribute('src')).toBe(ANNOUNCEMENT_URL)
  expect(frame?.getAttribute('title')).toBe('Bangmio 实时公告')
  expect(container.querySelector('a')).toBeNull()
})

it('suppresses the announcement only for the current local date', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 31, 12))
  localStorage.setItem(ANNOUNCEMENT_DISMISSED_KEY, '2026-10-31')

  await act(async () => root.render(<AnnouncementPopup />))
  expect(container.querySelector('dialog')).toBeNull()

  localStorage.setItem(ANNOUNCEMENT_DISMISSED_KEY, '2026-10-30')
  await act(async () => root.render(null))
  await act(async () => root.render(<AnnouncementPopup />))
  expect(container.querySelector('dialog')?.open).toBe(true)
})

it('stores today when the user chooses not to be reminded again', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 31, 12))
  await act(async () => root.render(<AnnouncementPopup />))

  const button = [...container.querySelectorAll('button')].find(el =>
    el.textContent?.includes('本日不再提醒')
  )
  await act(async () => button?.click())

  expect(localStorage.getItem(ANNOUNCEMENT_DISMISSED_KEY)).toBe('2026-10-31')
  expect(container.querySelector('dialog')).toBeNull()
})
