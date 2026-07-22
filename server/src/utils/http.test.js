import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  SCRAPE_UA,
  fetchHTML,
  fetchHTMLMulti,
  stripTags,
  unescapeHtml,
  parseNumber,
  fixUrl
} from './http.js'

function toArrayBuffer(str, encoding = 'utf-8') {
  const encoder = new TextEncoder()
  if (encoding === 'utf-8') {
    return encoder.encode(str).buffer
  }
  // 非 UTF-8 编码先用 TextDecoder 验证，测试里统一用 TextEncoder 只能生成 UTF-8，
  // 因此 GBK 场景通过传入已编码的字节数组来构造。
  return new Uint8Array(str.split('').map(c => c.charCodeAt(0))).buffer
}

describe('SCRAPE_UA', () => {
  it('是字符串', () => {
    expect(typeof SCRAPE_UA).toBe('string')
    expect(SCRAPE_UA.length).toBeGreaterThan(0)
  })
})

describe('stripTags', () => {
  it('移除 HTML 标签', () => {
    expect(stripTags('<p>hello</p>')).toBe('hello')
    expect(stripTags('<div class="x">text</div>')).toBe('text')
  })

  it('处理嵌套标签', () => {
    expect(stripTags('<div><p>nested</p></div>')).toBe('nested')
  })

  it('处理无标签文本', () => {
    expect(stripTags('plain text')).toBe('plain text')
  })
})

describe('unescapeHtml', () => {
  it('反转义常见 HTML 实体', () => {
    expect(unescapeHtml('&lt;div&gt;')).toBe('<div>')
    expect(unescapeHtml('&amp;')).toBe('&')
    expect(unescapeHtml('&quot;')).toBe('"')
  })
})

describe('parseNumber', () => {
  it('解析带逗号的数字', () => {
    expect(parseNumber('1,234')).toBe(1234)
    expect(parseNumber('1,234,567')).toBe(1234567)
  })

  it('解析普通数字', () => {
    expect(parseNumber('123')).toBe(123)
  })
})

describe('fixUrl', () => {
  it('补全协议', () => {
    expect(fixUrl('//example.com/image.jpg')).toMatch(/^https?:\/\//)
  })

  it('已完整 URL 不变', () => {
    const url = 'https://example.com/image.jpg'
    expect(fixUrl(url)).toBe(url)
  })
})

describe('fetchHTML', () => {
  it('超时抛出错误', async () => {
    // 使用一个不存在的 URL，设很短超时
    await expect(fetchHTML('https://nonexistent.invalid.xxx', { timeout: 100 })).rejects.toThrow()
  })
})

describe('fetchHTMLMulti', () => {
  let originalFetch

  beforeEach(() => {
    originalFetch = global.fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('第一个 URL 成功时返回该 URL 的结果', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(toArrayBuffer('<html>first</html>'))
    })

    const result = await fetchHTMLMulti(['https://a.test', 'https://b.test'])

    expect(result).toEqual({ html: '<html>first</html>', url: 'https://a.test' })
    // 并发择优 + 重试机制下会同时发起多个候选请求，只要包含首个成功 URL 即可
    expect(global.fetch).toHaveBeenCalledWith('https://a.test', expect.anything())
  })

  it('第一个 URL 失败、第二个 URL 成功时返回第二个 URL 的结果', async () => {
    global.fetch = vi.fn().mockImplementation(url => {
      if (url === 'https://a.test') {
        return Promise.resolve({
          ok: false,
          status: 500,
          arrayBuffer: () => Promise.resolve(toArrayBuffer('server error'))
        })
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        arrayBuffer: () => Promise.resolve(toArrayBuffer('<html>second</html>'))
      })
    })

    const result = await fetchHTMLMulti(['https://a.test', 'https://b.test'])

    expect(result).toEqual({ html: '<html>second</html>', url: 'https://b.test' })
    expect(global.fetch).toHaveBeenCalledWith('https://a.test', expect.anything())
    expect(global.fetch).toHaveBeenCalledWith('https://b.test', expect.anything())
  })

  it('所有 URL 都失败时抛出错误', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      arrayBuffer: () => Promise.resolve(toArrayBuffer('e2'))
    })

    await expect(fetchHTMLMulti(['https://a.test', 'https://b.test'])).rejects.toThrow(
      /HTTP 503|All sources failed/
    )
  })

  it('空数组时抛出 All sources failed 错误', async () => {
    global.fetch = vi.fn()

    await expect(fetchHTMLMulti([])).rejects.toThrow(/All sources failed/)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('成功时透传 timeout 选项到 fetchHTML', async () => {
    global.fetch = vi.fn().mockImplementation((url, opts) => {
      // 简单校验 signal 存在（fetchHTML 内部用 AbortController 实现 timeout）
      expect(opts.signal).toBeInstanceOf(AbortSignal)
      return Promise.resolve({
        ok: true,
        status: 200,
        arrayBuffer: () => Promise.resolve(toArrayBuffer('<html></html>'))
      })
    })

    await fetchHTMLMulti(['https://a.test'], { timeout: 500 })
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('GBK 编码响应体能正确解码为中文', async () => {
    const gbkBytes = new Uint8Array([0xbd, 0xf8, 0xbb, 0xf7, 0xb5, 0xc4, 0xbe, 0xde, 0xc8, 0xcb])
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(gbkBytes.buffer)
    })

    const html = await fetchHTML('https://a.test')
    expect(html).toBe('进击的巨人')
  })
})
