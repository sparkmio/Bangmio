import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { AuthProvider, useAuth } from './auth-provider'

function AuthState() {
  const { ready, isAuthenticated, user } = useAuth()
  return <output>{ready ? `${isAuthenticated}:${user?.username || ''}` : 'restoring'}</output>
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
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

describe('auth restoration state', () => {
  it('keeps the UI neutral until the cookie session check completes', async () => {
    let resolveResponse!: (response: unknown) => void
    const fetchMock = vi.fn(() => new Promise(resolve => (resolveResponse = resolve)))
    vi.stubGlobal('fetch', fetchMock)

    await act(async () =>
      root.render(
        <AuthProvider>
          <AuthState />
        </AuthProvider>
      )
    )
    expect(container.textContent).toBe('restoring')

    await act(async () =>
      resolveResponse({ ok: true, json: async () => ({ data: { username: 'fixture-user' } }) })
    )
    expect(container.textContent).toBe('true:fixture-user')
  })
})
