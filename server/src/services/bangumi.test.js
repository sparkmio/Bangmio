import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getIsChina,
  getAnimeTags,
  searchAnime,
  browseAnime,
  getAnimeDetail,
  getAnimeEpisodes,
  getAnimeCharacters,
  getClient
} from './bangumi.js'

/**
 * 构造一个 ok 响应，body 为可被 JSON.stringify 序列化的对象。
 * @param {Object} data - 响应体数据。
 * @param {number} [status=200] - HTTP 状态码。
 */
function okResponse(data, status = 200) {
  return {
    ok: true,
    status,
    text: () => Promise.resolve(JSON.stringify(data))
  }
}

/**
 * 构造一个非 ok 响应。
 * @param {number} status - HTTP 状态码。
 * @param {Object} [data={}] - 响应体数据。
 */
function errResponse(status, data = {}) {
  return {
    ok: false,
    status,
    text: () => Promise.resolve(JSON.stringify(data))
  }
}

describe('getIsChina', () => {
  it('CF_IP_COUNTRY 为 CN 时返回 true', () => {
    expect(getIsChina({ env: { CF_IP_COUNTRY: 'CN' } })).toBe(true)
  })

  it('CF_IP_COUNTRY 不为 CN 时返回 false', () => {
    expect(getIsChina({ env: { CF_IP_COUNTRY: 'US' } })).toBe(false)
    expect(getIsChina({ env: { CF_IP_COUNTRY: 'cn' } })).toBe(false) // 大小写敏感
  })

  it('env 或 CF_IP_COUNTRY 缺失时返回 false', () => {
    expect(getIsChina({})).toBe(false)
    expect(getIsChina({ env: {} })).toBe(false)
    expect(getIsChina({ env: null })).toBe(false)
  })
})

describe('getAnimeTags', () => {
  it('返回预设的标签数组，且每个标签包含 name 字段', async () => {
    const tags = await getAnimeTags()
    expect(Array.isArray(tags)).toBe(true)
    expect(tags.length).toBeGreaterThan(0)
    tags.forEach(t => {
      expect(t).toHaveProperty('name')
      expect(typeof t.name).toBe('string')
      expect(t.name.length).toBeGreaterThan(0)
    })
  })

  it('包含若干预期的标签', async () => {
    const tags = await getAnimeTags()
    const names = tags.map(t => t.name)
    expect(names).toContain('恋爱')
    expect(names).toContain('科幻')
    expect(names).toContain('机甲')
  })
})

describe('searchAnime', () => {
  let originalFetch

  beforeEach(() => {
    originalFetch = global.fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('调用 fetch 发起 POST 请求并返回搜索结果', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      okResponse({
        data: [{ id: 1, name: '某番剧' }],
        total: 1
      })
    )

    const result = await searchAnime('keyword', { limit: 10, page: 1 })

    expect(result).toEqual({ data: [{ id: 1, name: '某番剧' }], total: 1 })
    expect(global.fetch).toHaveBeenCalledTimes(1)

    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toContain('https://api.bgm.tv/v0/search/subjects')
    expect(url).toContain('limit=10')
    expect(url).toContain('offset=0')
    expect(opts.method).toBe('POST')
    expect(opts.headers['Content-Type']).toBe('application/json')

    const body = JSON.parse(opts.body)
    expect(body.keyword).toBe('keyword')
    expect(body.sort).toBe('rank')
    expect(body.filter).toEqual({})
  })

  it('HTTP 错误时抛出包含状态码的错误', async () => {
    global.fetch = vi.fn().mockResolvedValue(errResponse(404, { error: 'not found' }))

    await expect(searchAnime('x')).rejects.toMatchObject({
      message: expect.stringContaining('404')
    })
  })

  it('默认 limit=20、page=1 时 offset=0', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse({ data: [], total: 0 }))

    await searchAnime('kw')

    const [url] = global.fetch.mock.calls[0]
    expect(url).toContain('limit=20')
    expect(url).toContain('offset=0')
  })

  it('page=3、limit=5 时 offset=10', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse({ data: [], total: 0 }))

    await searchAnime('kw', { page: 3, limit: 5 })

    const [url] = global.fetch.mock.calls[0]
    expect(url).toContain('limit=5')
    expect(url).toContain('offset=10')
  })

  it('isChina=true 时使用国内代理域名', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse({ data: [], total: 0 }))

    await searchAnime('kw', { isChina: true })

    const [url] = global.fetch.mock.calls[0]
    expect(url).toContain('https://api.bangumi.lol/v0/search/subjects')
  })
})

describe('browseAnime', () => {
  let originalFetch

  beforeEach(() => {
    originalFetch = global.fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('不带关键词时 body.keyword 为空字符串', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse({ data: [], total: 0 }))

    await browseAnime({ limit: 20, page: 1 })

    const [, opts] = global.fetch.mock.calls[0]
    const body = JSON.parse(opts.body)
    expect(body.keyword).toBe('')
  })
})

describe('getAnimeDetail', () => {
  let originalFetch

  beforeEach(() => {
    originalFetch = global.fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('用正确的路径调用 fetch 并返回详情', async () => {
    const mockData = { id: 42, name: '某番剧' }
    global.fetch = vi.fn().mockResolvedValue(okResponse(mockData))

    const result = await getAnimeDetail(42)

    expect(result).toEqual(mockData)
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('https://api.bgm.tv/v0/subjects/42')
    expect(opts.method).toBeUndefined() // GET 请求不显式设置 method
  })

  it('isChina=true 时使用代理域名', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse({}))

    await getAnimeDetail(1, { isChina: true })

    const [url] = global.fetch.mock.calls[0]
    expect(url).toContain('https://api.bangumi.lol/v0/subjects/1')
  })

  it('将响应中的 lain.bgm.tv 图片地址重写为 lain.bangumi.lol', async () => {
    const mockData = {
      id: 1,
      images: { large: 'http://lain.bgm.tv/pic/large.jpg' },
      name: 'test'
    }
    global.fetch = vi.fn().mockResolvedValue(okResponse(mockData))

    const result = await getAnimeDetail(1)

    expect(result.images.large).toContain('lain.bangumi.lol')
    expect(result.images.large).not.toContain('lain.bgm.tv')
  })
})

describe('getAnimeEpisodes', () => {
  let originalFetch

  beforeEach(() => {
    originalFetch = global.fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('正确传递 subject_id、offset、limit 参数', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(okResponse({ data: [{ id: 1, name: 'ep01' }], total: 5 }))

    const result = await getAnimeEpisodes(100, { offset: 10, limit: 20 })

    expect(result).toEqual({ data: [{ id: 1, name: 'ep01' }], total: 5 })
    const [url] = global.fetch.mock.calls[0]
    expect(url).toContain('/v0/episodes')
    expect(url).toContain('subject_id=100')
    expect(url).toContain('offset=10')
    expect(url).toContain('limit=20')
  })

  it('未传 offset/limit 时使用默认值 0/100', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse({ data: [], total: 0 }))

    await getAnimeEpisodes(7)

    const [url] = global.fetch.mock.calls[0]
    expect(url).toContain('offset=0')
    expect(url).toContain('limit=100')
  })
})

describe('getAnimeCharacters', () => {
  let originalFetch

  beforeEach(() => {
    originalFetch = global.fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('调用 /v0/subjects/{id}/characters 路径', async () => {
    const mockData = [{ id: 1, name: '角色A' }]
    global.fetch = vi.fn().mockResolvedValue(okResponse(mockData))

    const result = await getAnimeCharacters(99)

    expect(result).toEqual(mockData)
    const [url] = global.fetch.mock.calls[0]
    expect(url).toBe('https://api.bgm.tv/v0/subjects/99/characters')
  })
})

describe('getClient', () => {
  let originalFetch

  beforeEach(() => {
    originalFetch = global.fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('返回的 client.get 调用 fetch 并附加 Bearer token', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse({ ok: true }))

    const client = getClient('my-token')
    await client.get('/v0/me')

    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('https://api.bgm.tv/v0/me')
    expect(opts.headers.Authorization).toBe('Bearer my-token')
    expect(opts.headers['User-Agent']).toBe('Bangmio/anime-manager')
  })

  it('client.get 透传 params 到 query string', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse({}))

    const client = getClient('t')
    await client.get('/v0/episodes', { subject_id: 5, limit: 10 })

    const [url] = global.fetch.mock.calls[0]
    expect(url).toContain('subject_id=5')
    expect(url).toContain('limit=10')
  })

  it('client.post 调用 fetch 使用 POST 方法并序列化 body', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse({ ok: true }))

    const client = getClient('t')
    await client.post('/v0/collection', { subject_id: 1, type: 2 })

    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('https://api.bgm.tv/v0/collection')
    expect(opts.method).toBe('POST')
    expect(opts.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(opts.body)).toEqual({ subject_id: 1, type: 2 })
  })

  it('client.delete 调用 fetch 使用 DELETE 方法', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse({}))

    const client = getClient('t')
    await client.delete('/v0/collection/1')

    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('https://api.bgm.tv/v0/collection/1')
    expect(opts.method).toBe('DELETE')
  })

  it('isChina=true 时 client 使用代理域名', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse({}))

    const client = getClient('t', true)
    await client.get('/v0/me')

    const [url] = global.fetch.mock.calls[0]
    expect(url).toContain('https://api.bangumi.lol/v0/me')
  })
})
