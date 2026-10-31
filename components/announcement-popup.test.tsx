import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  ANNOUNCEMENT_DISMISSED_KEY,
  ANNOUNCEMENT_SESSION_KEY,
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

it('opens with readable site-hosted announcement text and no external embed', async () => {
  await act(async () => root.render(<AnnouncementPopup />))

  expect(container.querySelector('dialog')?.open).toBe(true)
  expect(container.textContent).toContain('Bangmio 正在持续维护与改进')
  expect(container.querySelector('iframe')).toBeNull()
  expect(container.querySelector('a')).toBeNull()
  expect(localStorage.getItem(ANNOUNCEMENT_SESSION_KEY)).not.toBeNull()
})

it('does not reopen during the same browsing session after being closed', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 31, 0))
  await act(async () => root.render(<AnnouncementPopup />))
  await act(async () =>
    container.querySelector<HTMLButtonElement>('[aria-label="关闭公告"]')?.click()
  )

  vi.advanceTimersByTime(13 * 60 * 60 * 1000)

  await act(async () => root.unmount())
  root = createRoot(container)
  await act(async () => root.render(<AnnouncementPopup />))

  expect(container.querySelector('dialog')).toBeNull()
})

it('shows again on the next local day unless the user snoozed it', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 31, 23, 59))
  await act(async () => root.render(<AnnouncementPopup />))
  await act(async () =>
    container.querySelector<HTMLButtonElement>('[aria-label="关闭公告"]')?.click()
  )

  vi.setSystemTime(new Date(2026, 10, 1, 0, 1))
  await act(async () => root.unmount())
  root = createRoot(container)
  await act(async () => root.render(<AnnouncementPopup />))

  expect(container.querySelector('dialog')?.open).toBe(true)
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
  expect(localStorage.getItem(ANNOUNCEMENT_SESSION_KEY)).toBe('2026-10-31')
  expect(container.querySelector('dialog')).toBeNull()
})

it('closes when another same-origin tab disables reminders for today', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 31, 12))
  await act(async () => root.render(<AnnouncementPopup />))

  await act(async () => {
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: ANNOUNCEMENT_DISMISSED_KEY,
        newValue: '2026-10-31'
      })
    )
  })

  expect(container.querySelector('dialog')).toBeNull()
})
