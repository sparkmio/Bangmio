import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// vi.mock 必须在 import 之前；将 fetchHTML 替换为 vi.fn 以便测试路由时不发起真实请求
vi.mock('../utils/http.js', () => ({
  fetchHTML: vi.fn()
}))

import app, { cleanDoubanPage } from './douban.js'
import { fetchHTML } from '../utils/http.js'

/**
 * 模拟豆瓣条目页 HTML 片段。
 * 包含应被移除的导航/侧栏/推荐/广告/脚本/样式元素，
 * 以及应保留的评分区、短评区、长评区。
 */
const sampleDoubanHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>示例条目</title>
  <style>.x { color: red; }</style>
  <script>console.log('tracker')</script>
</head>
<body>
  <div class="top-nav-wrapper">顶部导航</div>
  <div class="nav-wrapper">主导航</div>
  <div id="dale_movie_subject_top_icon">顶部广告图标</div>
  <div class="sidebar">侧栏</div>
  <div id="recommendations">相关推荐</div>
  <div class="extra">额外区域</div>
  <iframe src="https://ad.example.com/banner.html"></iframe>
  <script>console.log('body script')</script>
  <style>body { margin: 0; }</style>

  <div id="interest_sectl">
    <strong class="rating_num" property="v:average">9.0</strong>
    <span property="v:votes" class="rating_people">100000人评价</span>
  </div>

  <div id="comments">
    <div class="comment-item">
      <span class="comment-info">短评用户A</span>
      <p class="comment-content">短评内容 1</p>
    </div>
    <div class="comment-item">
      <span class="comment-info">短评用户B</span>
      <p class="comment-content">短评内容 2</p>
    </div>
  </div>

  <div class="review-list">
    <div class="review-item">
      <h3>长评标题 1</h3>
      <div class="review-content">长评正文 1</div>
    </div>
  </div>

  <div class="ad-banner">横幅广告</div>
  <div class="promo-box">促销模块</div>
  <div class="header-loaded">含 ad 子串但非广告类（应保留）</div>
</body>
</html>
`

describe('cleanDoubanPage', () => {
  it('移除 .top-nav-wrapper 与 .nav-wrapper 导航元素', () => {
    const result = cleanDoubanPage(sampleDoubanHTML)
    expect(result).not.toContain('top-nav-wrapper')
    expect(result).not.toContain('nav-wrapper')
    expect(result).not.toContain('顶部导航')
    expect(result).not.toContain('主导航')
  })

  it('移除 #dale_movie_subject_top_icon、#recommendations、.extra、.sidebar', () => {
    const result = cleanDoubanPage(sampleDoubanHTML)
    expect(result).not.toContain('dale_movie_subject_top_icon')
    expect(result).not.toContain('recommendations')
    expect(result).not.toContain('顶部广告图标')
    expect(result).not.toContain('相关推荐')
    expect(result).not.toContain('额外区域')
    expect(result).not.toContain('侧栏')
  })

  it('移除 iframe、script、style 标签', () => {
    const result = cleanDoubanPage(sampleDoubanHTML)
    expect(result).not.toMatch(/<iframe[\s>]/i)
    expect(result).not.toMatch(/<script[\s>]/i)
    expect(result).not.toMatch(/<style[\s>]/i)
    expect(result).not.toContain('tracker')
  })

  it('保留 #interest_sectl 评分区', () => {
    const result = cleanDoubanPage(sampleDoubanHTML)
    expect(result).toContain('id="interest_sectl"')
    expect(result).toContain('9.0')
    expect(result).toContain('rating_people')
  })

  it('保留 .comment-item 短评', () => {
    const result = cleanDoubanPage(sampleDoubanHTML)
    expect(result).toContain('comment-item')
    expect(result).toContain('短评内容 1')
    expect(result).toContain('短评内容 2')
  })

  it('保留 .review-item 长评', () => {
    const result = cleanDoubanPage(sampleDoubanHTML)
    expect(result).toContain('review-item')
    expect(result).toContain('长评标题 1')
    expect(result).toContain('长评正文 1')
  })

  it('移除广告类元素（class 含 ad/promo/banner）', () => {
    const result = cleanDoubanPage(sampleDoubanHTML)
    expect(result).not.toContain('ad-banner')
    expect(result).not.toContain('promo-box')
    expect(result).not.toContain('横幅广告')
    expect(result).not.toContain('促销模块')
  })

  it('边界匹配：含 ad 子串但非广告类（如 header-loaded）应保留', () => {
    const result = cleanDoubanPage(sampleDoubanHTML)
    // header-loaded 含 "ad" 子串但不是以 ad/promo/banner 开头，应保留
    expect(result).toContain('header-loaded')
    expect(result).toContain('含 ad 子串但非广告类')
  })
})

describe('GET /page/:id', () => {
  beforeEach(() => {
    fetchHTML.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('抓取成功返回 200 与清洗后的 HTML', async () => {
    fetchHTML.mockResolvedValue(sampleDoubanHTML)

    const res = await app.request('/page/12345', { method: 'GET' })

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/text\/html/)

    const html = await res.text()
    expect(html).toContain('interest_sectl')
    expect(html).toContain('comment-item')
    expect(html).toContain('review-item')
    expect(html).not.toContain('top-nav-wrapper')
    expect(html).not.toContain('ad-banner')

    expect(fetchHTML).toHaveBeenCalledTimes(1)
    expect(fetchHTML).toHaveBeenCalledWith(
      'https://movie.douban.com/subject/12345/',
      expect.objectContaining({
        headers: expect.objectContaining({
          Referer: 'https://movie.douban.com/',
          Cookie: 'bid='
        })
      })
    )
  })

  it('上游抓取失败返回 200 与降级 HTML（直达链接）', async () => {
    fetchHTML.mockRejectedValue(new Error('upstream unavailable'))

    const res = await app.request('/page/999999', { method: 'GET' })

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/text\/html/)

    const html = await res.text()
    expect(html).toContain('豆瓣页面暂无法嵌入')
    expect(html).toContain('前往豆瓣查看')
    expect(html).toContain('https://movie.douban.com/subject/999999/')

    expect(fetchHTML).toHaveBeenCalledTimes(1)
  })

  it('缓存命中时不重复抓取 fetchHTML', async () => {
    fetchHTML.mockResolvedValue(sampleDoubanHTML)

    // 第一次请求：缓存未命中，应触发 fetchHTML
    const res1 = await app.request('/page/cache-hit-id', { method: 'GET' })
    expect(res1.status).toBe(200)
    expect(fetchHTML).toHaveBeenCalledTimes(1)

    // 第二次请求：缓存命中，不应再调 fetchHTML
    const res2 = await app.request('/page/cache-hit-id', { method: 'GET' })
    expect(res2.status).toBe(200)

    const html2 = await res2.text()
    expect(html2).toContain('interest_sectl')

    expect(fetchHTML).toHaveBeenCalledTimes(1) // 仍然只调用 1 次
  })

  it('不同 id 不共享缓存', async () => {
    fetchHTML.mockResolvedValue(sampleDoubanHTML)

    await app.request('/page/different-id-A', { method: 'GET' })
    expect(fetchHTML).toHaveBeenCalledTimes(1)

    await app.request('/page/different-id-B', { method: 'GET' })
    expect(fetchHTML).toHaveBeenCalledTimes(2)
  })
})
