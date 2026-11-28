import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { AuthProvider, useAuth } from './auth-provider'

let root: Root
let auth: ReturnType<typeof useAuth>
const retired = {
  bangmio_token: 'old.email.jwt',
  bangmio_user: JSON.stringify({ email: 'old@example.test' }),
  bgm_token_cached: 'old-linked-token',
  bgm_user_profile: JSON.stringify({ username: 'old-linked-user' })
}

function Probe() {
  auth = useAuth()
  return null
}

async function render() {
  await act(async () =>
    root.render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    )
  )
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  localStorage.clear()
  root = createRoot(document.createElement('div'))
})

afterEach(async () => {
  await act(async () => root.unmount())
  vi.unstubAllGlobals()
  localStorage.clear()
})

it('keeps the UI neutral until the cookie session check completes', async () => {
  let respond!: (response: Response) => void
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise<Response>(resolve => {
          respond = resolve
        })
    )
  )
  await render()
  expect(auth).toMatchObject({ ready: false, user: null })
  await act(async () => respond(Response.json({ data: { username: 'cookie-user' } })))
  expect(auth).toMatchObject({
    ready: true,
    isAuthenticated: true,
    user: { username: 'cookie-user' }
  })
})

it.each([true, false])(
  'removes retired email data and checks the Bangumi cookie (valid: %s)',
  async valid => {
    for (const [key, value] of Object.entries(retired)) localStorage.setItem(key, value)
    localStorage.setItem('bangumi_user', JSON.stringify({ username: 'cookie-user' }))
    localStorage.setItem('unrelated-preference', 'dark')
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 410 }))
      .mockResolvedValueOnce(
        valid
          ? Response.json({ data: { username: 'cookie-user' } })
          : new Response(null, { status: 401 })
      )
    vi.stubGlobal('fetch', fetch)

    await render()

    expect(fetch.mock.calls.map(([path]) => path)).toEqual([
      '/api/v1/auth/bgm-token',
      '/api/v1/user/me'
    ])
    expect(fetch.mock.calls[1][1]).toMatchObject({
      credentials: 'include',
      headers: { Accept: 'application/json' }
    })
    expect(fetch.mock.calls[1][1].headers).not.toHaveProperty('Authorization')
    for (const key of Object.keys(retired)) expect(localStorage.getItem(key)).toBeNull()
    expect(localStorage.getItem('unrelated-preference')).toBe('dark')
    expect(localStorage.getItem('bangumi_user')).toContain('cookie-user')
    expect(auth).toMatchObject({
      ready: true,
      kind: valid ? 'bangumi' : null,
      account: null,
      isAuthenticated: valid
    })
    expect(auth.user).toEqual(valid ? { username: 'cookie-user' } : null)
  }
)

it('does not replace a new login with a stale recovery result', async () => {
  let respond!: (response: Response) => void
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise<Response>(resolve => {
          respond = resolve
        })
    )
  )
  await render()
  await act(async () => auth.setAuth('', { id: 2, username: 'fresh-login' }, 'bangumi'))
  await act(async () => respond(Response.json({ data: { username: 'older-session' } })))
  expect(auth).toMatchObject({ ready: true, kind: 'bangumi', user: { username: 'fresh-login' } })
})
