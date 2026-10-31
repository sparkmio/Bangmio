import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ 'cf-ipcountry': 'CN' }))
}))
vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(async () => ({ env: { DB: 'test-binding' }, ctx: 'test-context' }))
}))
vi.mock('../server/src/app.js', () => ({ default: { fetch: vi.fn() } }))

// @ts-expect-error — the Hono entrypoint is JavaScript during the incremental migration.
import app from '../server/src/app.js'
import { apiFetchServer } from './api-server'

const dispatch = vi.mocked(app.fetch)

beforeEach(() => {
  dispatch.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('server-side API dispatch', () => {
  it('calls the in-process Hono app with the country header and Worker context', async () => {
    dispatch.mockResolvedValue(new Response('{"data":{"id":42}}'))
    const networkFetch = vi.fn()
    vi.stubGlobal('fetch', networkFetch)

    const response = await apiFetchServer<{ id: number }>(`/anime/42?test=${Date.now()}`)

    expect(response.data).toEqual({ id: 42 })
    expect(dispatch).toHaveBeenCalledOnce()
    const [request, env, context] = dispatch.mock.calls[0]
    expect(new URL(request.url).pathname).toBe('/api/v1/anime/42')
    expect(request.headers.get('cf-ipcountry')).toBe('CN')
    expect(env).toEqual({ DB: 'test-binding' })
    expect(context).toBe('test-context')
    expect(networkFetch).not.toHaveBeenCalled()
  })

  it('reuses only successful non-degraded GET responses briefly', async () => {
    dispatch.mockResolvedValue(new Response('{"data":[1,2]}'))
    const path = `/groups/discover?cache-test=${Date.now()}`

    await apiFetchServer(path)
    await apiFetchServer(path)

    expect(dispatch).toHaveBeenCalledOnce()
  })

  it('deduplicates concurrent requests for the same public resource', async () => {
    let release!: (response: Response) => void
    dispatch.mockImplementation(
      () => new Promise(resolve => (release = resolve)) as ReturnType<typeof app.fetch>
    )
    const path = `/anime/620010?single-flight=${Math.random()}`
    const first = apiFetchServer(path)
    const second = apiFetchServer(path)

    await new Promise(resolve => setTimeout(resolve, 0))
    expect(dispatch).toHaveBeenCalledOnce()
    release(new Response('{"data":{"id":620010}}'))

    await expect(Promise.all([first, second])).resolves.toMatchObject([
      { data: { id: 620010 } },
      { data: { id: 620010 } }
    ])
  })

  it('retries a transient upstream failure once', async () => {
    dispatch
      .mockResolvedValueOnce(new Response('{"error":"upstream unavailable"}', { status: 502 }))
      .mockResolvedValueOnce(new Response('{"data":{"id":620011}}'))

    await expect(apiFetchServer(`/anime/620011?retry=${Math.random()}`)).resolves.toMatchObject({
      data: { id: 620011 }
    })
    expect(dispatch).toHaveBeenCalledTimes(2)
  })

  it('returns a marked last-known anime response during an upstream failure for up to 30 minutes', async () => {
    let now = Date.now()
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    const path = `/anime/620001?stale-test=${Math.random()}`
    dispatch.mockResolvedValueOnce(new Response('{"data":{"id":620001}}'))

    await apiFetchServer(path)
    now += 121_000
    dispatch
      .mockRejectedValueOnce(new Error('upstream unavailable'))
      .mockRejectedValueOnce(new Error('upstream unavailable'))

    await expect(apiFetchServer<{ id: number }>(path)).resolves.toMatchObject({
      data: { id: 620001 },
      stale: true
    })

    now += 30 * 60_000
    dispatch
      .mockRejectedValueOnce(new Error('upstream unavailable'))
      .mockRejectedValueOnce(new Error('upstream unavailable'))
    await expect(apiFetchServer(path)).rejects.toThrow('upstream unavailable')
  })

  it('never uses the stale anime cache for non-anime endpoints', async () => {
    let now = Date.now()
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    const path = `/collection?stale-test=${Math.random()}`
    dispatch.mockResolvedValueOnce(new Response('{"data":{"items":[]}}'))

    await apiFetchServer(path)
    now += 121_000
    dispatch
      .mockRejectedValueOnce(new Error('upstream unavailable'))
      .mockRejectedValueOnce(new Error('upstream unavailable'))

    await expect(apiFetchServer(path)).rejects.toThrow('upstream unavailable')
  })

  it('does not use stale anime data for authoritative client errors', async () => {
    const path = `/anime/620002?stale-test=${Math.random()}`
    dispatch.mockResolvedValueOnce(new Response('{"data":{"id":620002}}'))
    await apiFetchServer(path)

    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 121_000)
    dispatch.mockResolvedValueOnce(new Response('{"error":"missing"}', { status: 404 }))

    await expect(apiFetchServer(path)).rejects.toMatchObject({ status: 404 })
  })

  it('preserves upstream status for the page boundary', async () => {
    dispatch.mockResolvedValue(new Response('{"error":"missing"}', { status: 404 }))

    await expect(apiFetchServer(`/anime/404?test=${Date.now()}`)).rejects.toMatchObject({
      status: 404
    })
  })
})
