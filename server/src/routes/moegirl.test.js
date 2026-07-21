import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// vi.mock 必须在 import 之前；将 fetchHTML 替换为 vi.fn 以便测试路由时不发起真实请求
vi.mock('../utils/http.js', () => ({
  fetchHTML: vi.fn()
}))

import app, { cleanMoegirlPage } from './moegirl.js'
import { fetchHTML } from '../utils/http.js'

/**
 * 模拟萌娘百科页面 HTML 片段。
 * 包含应被移除的导航/页脚/侧栏/编辑按钮/脚本/样式/广告元素，
 * 以及应保留的 .mw-parser-output 内容。
 * 注意：mw-parser-output 内的正文需足够长（清洗后 > 100 字符），
 * 否则路由会判定为内容过短并返回降级 HTML。
 */
const sampleMoegirlHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>示例词条</title>
  <style>.x { color: red; }</style>
  <script>console.log('tracker')</script>
</head>
<body>
  <div class="header">站点头部</div>
  <div class="footer">站点页脚</div>
  <div id="mw-navigation">
    <div class="sidebar">导航侧栏</div>
  </div>
  <div class="sidebar">独立侧栏</div>
  <iframe src="https://ad.example.com/banner.html"></iframe>
  <script>console.log('body script')</script>
  <style>body { margin: 0; }</style>

  <div class="mw-body-content">
    <div class="mw-parser-output">
      <p>词条正文段落 1。这里是一段较长的概述文字，用于介绍该词条的基本信息与背景设定。</p>
      <p>词条正文段落 2。这里是第二段正文，继续展开词条主题的相关内容与详细描述。</p>
      <h2>二级标题<span class="mw-editsection">[<a href="/edit">编辑</a>]</span></h2>
      <p>二级标题下正文。这里是对应二级标题下的详细说明，包含若干细节描述与补充信息。</p>
      <h2>另一个二级标题<span class="mw-editsection">[<a href="/edit">编辑</a>]</span></h2>
      <p>另一个二级标题下正文。这里继续展开新的章节内容，提供更多相关说明与背景介绍。</p>
      <ul>
        <li>列表项 1：相关条目一</li>
        <li>列表项 2：相关条目二</li>
        <li>列表项 3：相关条目三</li>
      </ul>
      <div class="ad-box">广告内容</div>
      <div class="promo">促销</div>
    </div>
  </div>

  <div class="header-loaded">含 header 子串但非 header 类（应保留）</div>
</body>
</html>
`

describe('cleanMoegirlPage', () => {
  it('移除 .header、.footer、#mw-navigation、.sidebar', () => {
    const result = cleanMoegirlPage(sampleMoegirlHTML)
    expect(result).not.toMatch(/class="header"/)
    expect(result).not.toMatch(/class="footer"/)
    expect(result).not.toMatch(/id="mw-navigation"/)
    expect(result).not.toMatch(/class="sidebar"/)
    expect(result).not.toContain('站点头部')
    expect(result).not.toContain('站点页脚')
    expect(result).not.toContain('导航侧栏')
    expect(result).not.toContain('独立侧栏')
  })

  it('移除 .mw-editsection 编辑按钮', () => {
    const result = cleanMoegirlPage(sampleMoegirlHTML)
    expect(result).not.toMatch(/class="mw-editsection"/)
    expect(result).not.toContain('[编辑]')
  })

  it('移除 iframe、script、style 标签', () => {
    const result = cleanMoegirlPage(sampleMoegirlHTML)
    expect(result).not.toMatch(/<iframe[\s>]/i)
    expect(result).not.toMatch(/<script[\s>]/i)
    expect(result).not.toMatch(/<style[\s>]/i)
    expect(result).not.toContain('tracker')
  })

  it('仅保留 .mw-parser-output 内容（不包含 body 其他部分）', () => {
    const result = cleanMoegirlPage(sampleMoegirlHTML)
    expect(result).toContain('词条正文段落 1')
    expect(result).toContain('词条正文段落 2')
    expect(result).toContain('二级标题')
    expect(result).toContain('二级标题下正文')
    // header-loaded 位于 .mw-parser-output 之外，应被丢弃
    expect(result).not.toContain('header-loaded')
  })

  it('移除广告类元素（class 含 ad/promo/banner）', () => {
    const result = cleanMoegirlPage(sampleMoegirlHTML)
    expect(result).not.toContain('ad-box')
    expect(result).not.toContain('promo')
    expect(result).not.toContain('广告内容')
    expect(result).not.toContain('促销')
  })

  it('边界匹配：含 header 子串但非 header 类应保留', () => {
    // header-loaded 含 header 子串但类名不等于 header/不以 ad/promo/banner 开头
    // 但位于 .mw-parser-output 之外，整体会被丢弃——
    // 这里构造一个 .mw-parser-output 内含 header-loaded 的样例
    const html = `
      <html><body>
        <div class="mw-parser-output">
          <div class="header-loaded">应保留</div>
        </div>
      </body></html>
    `
    const result = cleanMoegirlPage(html)
    expect(result).toContain('header-loaded')
    expect(result).toContain('应保留')
  })

  it('无 .mw-parser-output 时回退到 body 内容', () => {
    const html = `
      <html><body>
        <h1>页面标题</h1>
        <p>无 parser-output 的正文</p>
      </body></html>
    `
    const result = cleanMoegirlPage(html)
    expect(result).toContain('无 parser-output 的正文')
  })
})

describe('GET /page/:name', () => {
  beforeEach(() => {
    fetchHTML.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('抓取成功返回 200 与清洗后的 HTML', async () => {
    fetchHTML.mockResolvedValue(sampleMoegirlHTML)

    const res = await app.request('/page/TestPage', { method: 'GET' })

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/text\/html/)

    const html = await res.text()
    expect(html).toContain('词条正文段落 1')
    expect(html).not.toMatch(/class="header"/)
    expect(html).not.toMatch(/class="sidebar"/)
    expect(html).not.toMatch(/class="mw-editsection"/)

    expect(fetchHTML).toHaveBeenCalledTimes(1)
    expect(fetchHTML).toHaveBeenCalledWith(
      'https://zh.moegirl.org.cn/TestPage',
      expect.objectContaining({
        headers: expect.objectContaining({
          Referer: 'https://zh.moegirl.org.cn/',
          'Cache-Control': 'no-cache'
        })
      })
    )
  })

  it('上游抓取失败返回 200 与降级 HTML（直达链接，双源尝试）', async () => {
    fetchHTML.mockRejectedValue(new Error('upstream unavailable'))

    const res = await app.request('/page/FailPage', { method: 'GET' })

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/text\/html/)

    const html = await res.text()
    expect(html).toContain('萌娘百科页面暂无法嵌入')
    // 降级 HTML 应包含国内 + 海外两个直达链接
    expect(html).toContain('https://zh.moegirl.org.cn/FailPage')
    expect(html).toContain('https://zh.moegirl.uk/FailPage')

    // 双源尝试：fetchHTML 应被调用 2 次
    expect(fetchHTML).toHaveBeenCalledTimes(2)
    expect(fetchHTML).toHaveBeenNthCalledWith(
      1,
      'https://zh.moegirl.org.cn/FailPage',
      expect.objectContaining({ headers: expect.any(Object) })
    )
    expect(fetchHTML).toHaveBeenNthCalledWith(
      2,
      'https://zh.moegirl.uk/FailPage',
      expect.objectContaining({ headers: expect.any(Object) })
    )
  })

  it('name 参数 URL decode 正确（中文名）', async () => {
    fetchHTML.mockResolvedValue(sampleMoegirlHTML)

    const encoded = encodeURIComponent('中文词条名')
    const res = await app.request(`/page/${encoded}`, { method: 'GET' })

    expect(res.status).toBe(200)
    expect(fetchHTML).toHaveBeenCalledTimes(1)
    // 路由内部应解码 name 后再调用 fetchHTML，URL 应包含解码后的中文名（再次 encodeURIComponent）
    expect(fetchHTML).toHaveBeenCalledWith(
      `https://zh.moegirl.org.cn/${encodeURIComponent('中文词条名')}`,
      expect.objectContaining({
        headers: expect.any(Object)
      })
    )
  })

  it('缓存命中时不重复抓取 fetchHTML', async () => {
    fetchHTML.mockResolvedValue(sampleMoegirlHTML)

    // 第一次请求：缓存未命中，应触发 fetchHTML
    const res1 = await app.request('/page/CacheHit', { method: 'GET' })
    expect(res1.status).toBe(200)
    expect(fetchHTML).toHaveBeenCalledTimes(1)

    // 第二次请求：缓存命中，不应再调 fetchHTML
    const res2 = await app.request('/page/CacheHit', { method: 'GET' })
    expect(res2.status).toBe(200)

    const html2 = await res2.text()
    expect(html2).toContain('词条正文段落 1')

    expect(fetchHTML).toHaveBeenCalledTimes(1) // 仍然只调用 1 次
  })

  it('不同 name 不共享缓存', async () => {
    fetchHTML.mockResolvedValue(sampleMoegirlHTML)

    await app.request('/page/DifferentNameA', { method: 'GET' })
    expect(fetchHTML).toHaveBeenCalledTimes(1)

    await app.request('/page/DifferentNameB', { method: 'GET' })
    expect(fetchHTML).toHaveBeenCalledTimes(2)
  })
})
