import { afterEach, describe, expect, it, vi } from 'vitest'
import app from './groups.js'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('group discovery fallback', () => {
  it('serves the last successful topics as degraded data after upstream failure', async () => {
    vi.useFakeTimers()
    const html = `<!doctype html><table class="topic_list"><tbody><tr>
      <td><a href="/group/topic/321">可用话题</a></td>
      <td><a href="/group/forum">站务论坛</a></td>
      <td><a href="/user/tester">测试用户</a></td><td>(12)</td>
    </tr></tbody></table>`
    const upstream = vi.fn().mockImplementation(async () => new Response(html))
    vi.stubGlobal('fetch', upstream)

    const firstResponse = await app.request('/discover', {}, {})
    expect(firstResponse.status).toBe(200)
    await expect(firstResponse.json()).resolves.toMatchObject({
      data: [expect.objectContaining({ id: '321', title: '可用话题' })],
      degraded: false
    })

    vi.setSystemTime(Date.now() + 6 * 60 * 1000)
    upstream.mockRejectedValue(new Error('upstream unavailable'))

    const fallbackResponse = await app.request('/discover', {}, {})
    expect(fallbackResponse.status).toBe(200)
    await expect(fallbackResponse.json()).resolves.toMatchObject({
      data: [expect.objectContaining({ id: '321', title: '可用话题' })],
      degraded: true
    })
    expect(upstream.mock.calls.length).toBeGreaterThan(3)
  })

  it('does not cache a degraded group list as a successful result', async () => {
    vi.stubGlobal('caches', undefined)
    const upstream = vi.fn().mockResolvedValue(
      new Response(`<html><body><h1>暂时不可用</h1><div>${'x'.repeat(600)}</div></body></html>`)
    )
    vi.stubGlobal('fetch', upstream)

    const first = await app.request('/', {}, { CF_IP_COUNTRY: 'CN' })
    const firstCallCount = upstream.mock.calls.length
    expect(first.status).toBe(200)
    await expect(first.json()).resolves.toMatchObject({ degraded: true })

    const second = await app.request('/', {}, { CF_IP_COUNTRY: 'CN' })
    expect(second.status).toBe(200)
    expect(upstream.mock.calls.length).toBeGreaterThan(firstCallCount)
  })
})
