import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
// vi.mock 必须在 import 之前；将 fetchHTML 替换为 vi.fn 以便测试路由时不发起真实请求
vi.mock('../utils/http.js', () => ({
  fetchHTML: vi.fn(),
  fixUrl: vi.fn((url, base) => {
    if (!url) return ''
    if (url.startsWith('//')) return `https:${url}`
    if (url.startsWith('/')) return `${base}${url}`
    return url
  })
}))

vi.mock('../services/moegirl.js', () => ({
  getMoegirlSummary: vi.fn()
}))

import app, { cleanMoegirlPage } from './moegirl.js'
import { fetchHTML } from '../utils/http.js'
import { getMoegirlSummary } from '../services/moegirl.js'

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
  <noscript id="MOE_SKIN_NOSCRIPT">需要启用 JavaScript</noscript>
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
      <p><img data-src="/images/thumb/a/b/sample.jpg" alt="示例图片" src="/img/placeholder.png"></p>
      <p><a href="/wiki/%E8%BF%9B%E5%87%BB%E7%9A%84%E5%B7%A8%E4%BA%BA">相关条目</a></p>
      <template id="some-template"><span>模板内容</span></template>
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
    // 原页面中的 style 标签已移除；注入的基础 CSS 中不应包含原页面样式
    expect(result).not.toContain('.x { color: red; }')
    expect(result).not.toContain('body { margin: 0; }')
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

  it('移除 noscript 与 template 残留', () => {
    const result = cleanMoegirlPage(sampleMoegirlHTML)
    expect(result).not.toMatch(/<noscript[\s>]/i)
    expect(result).not.toMatch(/<template[\s>]/i)
    expect(result).not.toContain('MOE_SKIN_NOSCRIPT')
    expect(result).not.toContain('模板内容')
  })

  it('处理图片懒加载（data-src -> src）', () => {
    const result = cleanMoegirlPage(sampleMoegirlHTML)
    expect(result).toContain('src="https://zh.moegirl.org.cn/images/thumb/a/b/sample.jpg"')
    expect(result).not.toContain('data-src=')
  })

  it('将相对链接转换为萌娘域名绝对链接', () => {
    const result = cleanMoegirlPage(sampleMoegirlHTML)
    expect(result).toContain(
      'https://zh.moegirl.org.cn/wiki/%E8%BF%9B%E5%87%BB%E7%9A%84%E5%B7%A8%E4%BA%BA'
    )
  })

  it('注入 viewport meta 与表格/图片响应式 CSS', () => {
    const result = cleanMoegirlPage(sampleMoegirlHTML)
    expect(result).toContain('<meta name="viewport" content="width=device-width,initial-scale=1">')
    expect(result).toContain('max-width: 100%')
    expect(result).toContain('overflow-x: auto')
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
    // 实现优先使用带 ?useskin=vector 的皮肤参数
    expect(fetchHTML).toHaveBeenCalledWith(
      'https://zh.moegirl.org.cn/TestPage?useskin=vector',
      expect.objectContaining({
        headers: expect.objectContaining({
          Referer: 'https://zh.moegirl.org.cn/',
          'Cache-Control': 'no-cache'
        })
      })
    )
  })

  it('上游抓取失败返回 200 与降级 HTML（直达链接，四源尝试）', async () => {
    fetchHTML.mockRejectedValue(new Error('upstream unavailable'))

    const res = await app.request('/page/FailPage', { method: 'GET' })

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/text\/html/)

    const html = await res.text()
    expect(html).toContain('萌娘百科页面暂无法嵌入')
    // 降级 HTML 应包含国内 + 海外两个直达链接
    expect(html).toContain('https://zh.moegirl.org.cn/FailPage')
    expect(html).toContain('https://zh.moegirl.uk/FailPage')

    // 四源尝试：vector 皮肤 + 默认皮肤，国内 + 海外
    expect(fetchHTML).toHaveBeenCalledTimes(4)
    expect(fetchHTML).toHaveBeenNthCalledWith(
      1,
      'https://zh.moegirl.org.cn/FailPage?useskin=vector',
      expect.objectContaining({ headers: expect.any(Object) })
    )
    expect(fetchHTML).toHaveBeenNthCalledWith(
      2,
      'https://zh.moegirl.org.cn/FailPage',
      expect.objectContaining({ headers: expect.any(Object) })
    )
    expect(fetchHTML).toHaveBeenNthCalledWith(
      3,
      'https://zh.moegirl.uk/FailPage?useskin=vector',
      expect.objectContaining({ headers: expect.any(Object) })
    )
    expect(fetchHTML).toHaveBeenNthCalledWith(
      4,
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
      `https://zh.moegirl.org.cn/${encodeURIComponent('中文词条名')}?useskin=vector`,
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

describe('GET /:name/summary', () => {
  beforeEach(() => {
    getMoegirlSummary.mockReset()
  })

  it('返回结构化摘要 JSON', async () => {
    getMoegirlSummary.mockResolvedValue({
      title: '进击的巨人',
      extract: '第一段\n\n第二段',
      url: 'https://zh.moegirl.org.cn/%E8%BF%9B%E5%87%BB%E7%9A%84%E5%B7%A8%E4%BA%BA'
    })

    const encoded = encodeURIComponent('进击的巨人')
    const res = await app.request(`/${encoded}/summary`, { method: 'GET' }, { CF_IP_COUNTRY: 'CN' })
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.data).toMatchObject({
      title: '进击的巨人',
      extract: '第一段\n\n第二段',
      url: 'https://zh.moegirl.org.cn/%E8%BF%9B%E5%87%BB%E7%9A%84%E5%B7%A8%E4%BA%BA'
    })
    expect(getMoegirlSummary).toHaveBeenCalledWith('进击的巨人', 'https://zh.moegirl.org.cn')
  })

  it('服务异常时不抛 500，返回 data: null', async () => {
    getMoegirlSummary.mockRejectedValue(new Error('boom'))

    const res = await app.request('/FailPage/summary', { method: 'GET' })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toBeNull()
  })
})
