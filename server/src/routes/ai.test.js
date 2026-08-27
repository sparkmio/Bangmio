import { afterEach, describe, expect, it, vi } from 'vitest'
import app from './ai.js'

describe('AI chat route', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('does not expose an unconfigured service', async () => {
    const response = await app.request(
      '/chat',
      { method: 'POST', body: JSON.stringify({ messages: [{ role: 'user', content: '你好' }] }) },
      {}
    )
    expect(response.status).toBe(503)
  })

  it('forwards only a bounded chat request and returns content', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ choices: [{ message: { content: '你好，我能帮你查找番剧资料。' } }] }),
          { status: 200 }
        )
      )
    vi.stubGlobal('fetch', fetchMock)
    const response = await app.request(
      '/chat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: '介绍一下这部动画' }],
          context: '条目：示例动画'
        })
      },
      { ZHIPU_API_KEY: 'test-key' }
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      data: { message: expect.stringContaining('番剧') }
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-key' })
      })
    )
    const request = fetchMock.mock.calls[0][1]
    expect(JSON.parse(request.body)).toMatchObject({ model: 'glm-5.3-flash' })
  })
})
