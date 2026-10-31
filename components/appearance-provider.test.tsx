import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AppearanceProvider, useAppearance } from './appearance-provider'

function AppearanceState() {
  const { theme, motion, glass } = useAppearance()
  return <output>{`${theme}:${motion}:${glass}`}</output>
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  localStorage.clear()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})

it('syncs theme and appearance preferences from another same-origin tab', async () => {
  await act(async () =>
    root.render(
      <AppearanceProvider>
        <AppearanceState />
      </AppearanceProvider>
    )
  )

  localStorage.setItem('theme', 'dark')
  localStorage.setItem('appearance-motion', 'false')
  localStorage.setItem('appearance-glass', 'false')
  await act(async () => {
    window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: 'dark' }))
  })

  expect(container.textContent).toBe('dark:false:false')
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(document.documentElement.dataset.motion).toBe('off')
  expect(document.documentElement.dataset.glass).toBe('off')
})
