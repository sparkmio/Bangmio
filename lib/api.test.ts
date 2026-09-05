import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from './api'
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})
describe('API requests', () => {
  it('uses dev port 3001 without configuration', async () => {
    vi.stubEnv('BANGMIO_API_ORIGIN', '')
    vi.stubEnv('NEXT_PUBLIC_API_ORIGIN', '')
    const fetcher = vi.fn().mockResolvedValue(new Response('{"data":{}}'))
    vi.stubGlobal('fetch', fetcher)
    await apiFetch('/anime/1')
    expect(fetcher.mock.calls[0][0]).toBe('http://localhost:3001/api/v1/anime/1')
    expect(fetcher.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
  })
  it('does not cache authenticated or mutating requests', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{"data":{}}'))
    vi.stubGlobal('fetch', fetcher)
    await apiFetch('/collection/1', {}, 'test-token')
    expect(fetcher.mock.calls[0][1].cache).toBe('no-store')
    expect(fetcher.mock.calls[0][1].next).toBeUndefined()
  })
  it('preserves 404 for the page boundary to distinguish from 502', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{"error":"missing"}', { status: 404 }))
    )
    await expect(apiFetch('/anime/1')).rejects.toMatchObject({ status: 404 })
  })
})

it.each([
  { cache: 'no-store' as const },
  { headers: { Authorization: 'Bearer fixture' } },
  { headers: { 'X-Bangumi-Username': 'fixture' } }
] as RequestInit[])('never revalidates explicitly private requests %o', async init => {
  const fetcher = vi.fn().mockResolvedValue(new Response('{"data":{}}'))
  vi.stubGlobal('fetch', fetcher)
  await apiFetch('/collection/1', init)
  expect(fetcher.mock.calls[0][1].cache).toBe('no-store')
  expect(fetcher.mock.calls[0][1].next).toBeUndefined()
})

it.each(['not json', '{}', 'null', '[]', '{"error":"upstream failed"}'])(
  'rejects invalid successful response %s',
  async body => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body)))
    await expect(apiFetch('/fixture')).rejects.toMatchObject({ status: 502 })
  }
)
it('accepts an explicitly empty collection without pretending it is a failure', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"data":null}')))
  await expect(apiFetch('/collection/1')).resolves.toEqual({ data: null })
})
it('combines caller cancellation with the request deadline', async () => {
  const controller = new AbortController()
  const fetcher = vi.fn().mockResolvedValue(new Response('{"data":[]}'))
  vi.stubGlobal('fetch', fetcher)
  await apiFetch('/fixture', { signal: controller.signal })
  const signal = fetcher.mock.calls[0][1].signal as AbortSignal
  expect(signal.aborted).toBe(false)
  controller.abort()
  expect(signal.aborted).toBe(true)
})

it.each(['{"success":true}', '{"message":"已删除"}'])(
  'preserves legacy write acknowledgements %s without treating them as page data',
  async body => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => new Response(body))
    )
    await expect(apiFetch('/fixture', { method: 'POST' })).resolves.toEqual(JSON.parse(body))
    await expect(apiFetch('/fixture')).rejects.toMatchObject({ status: 502 })
  }
)
