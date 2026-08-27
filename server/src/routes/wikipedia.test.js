import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../utils/http.js', () => ({
  fetchHTML: vi.fn(),
  fixUrl: vi.fn((url, base) => {
    if (!url) return ''
    if (url.startsWith('//')) return `https:${url}`
    if (url.startsWith('/')) return `${base}${url}`
    return url
  }),
  stripTags: vi.fn(value =>
    String(value || '')
      .replace(/<[^>]+>/g, '')
      .trim()
  )
}))

import app, { cleanWikipediaPage } from './wikipedia.js'
import { fetchHTML } from '../utils/http.js'

const SAMPLE_PAGE = `
  <div class="mw-parser-output">
    <p class="shortdescription">应移除的简介</p>
    <span class="mw-editsection">编辑</span>
    <table class="infobox"><tr><th>作品</th><td>测试番剧</td></tr></table>
    <p>这是维基百科的正文内容。</p>
    <p><a href="/wiki/动画">相关动画</a></p>
    <img src="//upload.wikimedia.org/example.png">
    <div class="navbox">应移除的导航模板</div>
    <script>tracker()</script>
  </div>
`

describe('cleanWikipediaPage', () => {
  it('移除编辑、导航和脚本，并保留正文', () => {
    const result = cleanWikipediaPage(SAMPLE_PAGE)
    expect(result).toContain('这是维基百科的正文内容。')
    expect(result).not.toContain('应移除的简介')
    expect(result).not.toContain('编辑')
    expect(result).not.toContain('应移除的导航模板')
    expect(result).not.toContain('tracker')
  })

  it('将相对链接与协议相对图片地址绝对化', () => {
    const result = cleanWikipediaPage(SAMPLE_PAGE)
    expect(result).toContain('https://zh.wikipedia.org/wiki/动画')
    expect(result).toContain('https://upload.wikimedia.org/example.png')
  })
})

describe('Wikipedia routes', () => {
  beforeEach(() => {
    fetchHTML.mockReset()
  })

  it('搜索结果返回可嵌入页面需要的标题与原站链接', async () => {
    fetchHTML.mockResolvedValue(
      JSON.stringify({
        query: {
          search: [{ title: '测试动画', snippet: '<span>动画作品</span>' }]
        }
      })
    )

    const response = await app.request('/search?q=测试动画')
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: {
        results: [
          {
            title: '测试动画',
            description: '动画作品',
            url: 'https://zh.wikipedia.org/wiki/%E6%B5%8B%E8%AF%95%E5%8A%A8%E7%94%BB'
          }
        ]
      },
      code: 200
    })
  })

  it('摘要接口返回纯文字正文与原站链接', async () => {
    fetchHTML.mockResolvedValue(
      JSON.stringify({
        query: {
          pages: [{ title: '测试动画', extract: '这是纯文字摘要。' }]
        }
      })
    )

    const response = await app.request('/summary/测试动画')
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: {
        title: '测试动画',
        extract: '这是纯文字摘要。',
        url: 'https://zh.wikipedia.org/wiki/%E6%B5%8B%E8%AF%95%E5%8A%A8%E7%94%BB'
      },
      code: 200
    })
  })
  it('正文代理返回清洗后的完整 HTML', async () => {
    fetchHTML.mockResolvedValue(
      JSON.stringify({
        parse: { displaytitle: '测试动画', text: SAMPLE_PAGE }
      })
    )

    const response = await app.request('/page/测试动画')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toMatch(/text\/html/)
    const html = await response.text()
    expect(html).toContain('<base target="_blank">')
    expect(html).toContain('这是维基百科的正文内容。')
    expect(html).not.toContain('应移除的导航模板')
  })

  it('上游失败时返回可点击的降级页面', async () => {
    fetchHTML.mockRejectedValue(new Error('upstream unavailable'))

    const response = await app.request('/page/降级测试')
    expect(response.status).toBe(200)
    const html = await response.text()
    expect(html).toContain('维基百科页面暂时无法加载')
    expect(html).toContain('https://zh.wikipedia.org/wiki/%E9%99%8D%E7%BA%A7%E6%B5%8B%E8%AF%95')
  })
})
