import { Hono } from 'hono'
import { parseHTML } from 'linkedom'
import * as bangumiService from '../services/bangumi.js'
import {
  searchDouban,
  getDoubanAbstract,
  getDoubanComments,
  getDoubanReviews,
  getDoubanSummary
} from '../services/douban.js'
import { createCache } from '../utils/cache.js'
import { fetchHTML, fixUrl } from '../utils/http.js'
import { CACHE_TTL_DOUBAN } from '../config.js'

const app = new Hono()

const cache = createCache(CACHE_TTL_DOUBAN)

/** 豆瓣页面代理缓存（5 分钟） */
const pageCache = createCache(5 * 60 * 1000)

const DOUBAN_BASE_URL = 'https://movie.douban.com'

/** 注入豆瓣清洗后页面的响应式基础 CSS */
const DOUBAN_BASE_CSS = `
* { box-sizing: border-box; }
html { font-size: 16px; }
body {
  margin: 0;
  padding: 1rem;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  line-height: 1.6;
  color: #111;
  background: #fff;
}
img, video { max-width: 100%; height: auto; }
a { color: #0066cc; text-decoration: none; }
#interest_sectl { margin-bottom: 1.5rem; }
.comment-item, .review-item { margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #eee; }
`

/** 需要从豆瓣页面移除的选择器列表 */
const DOUBAN_REMOVE_SELECTORS = [
  '.top-nav-wrapper',
  '.nav-wrapper',
  '#dale_movie_subject_top_icon',
  '.sidebar',
  '#recommendations',
  '.extra',
  'iframe',
  'script',
  'style'
]

/**
 * 将清洗后的 HTML 片段包装为包含 viewport 与基础样式的完整文档。
 * @param {string} fragment - 清洗后的 body 片段。
 * @returns {string} 完整 HTML 文档字符串。
 */
function wrapDocument(fragment) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>${DOUBAN_BASE_CSS}</style>
</head>
<body>
${fragment}
</body>
</html>`
}

/**
 * 判断元素的 class 是否包含广告类标识（ad/promo/banner）。
 * 使用边界匹配避免误删含 "ad" 子串的正常类名（如 header、loaded）。
 * @param {Element} el - DOM 元素。
 * @returns {boolean} 若 class 含广告标识返回 true，否则 false。
 */
function isAdElement(el) {
  const cls = el.getAttribute('class') || ''
  if (!cls) return false
  return /(^|[\s_-])(ad|advert|advertisement|promo|promotion|banner)/i.test(cls)
}

/**
 * 清洗豆瓣条目页面 HTML：移除导航、侧栏、推荐、脚本、样式及广告元素。
 * 保留评分区（#interest_sectl）、短评区（.comment-item）、长评区（.review-item）等核心内容。
 * @param {string} html - 原始页面 HTML。
 * @returns {string} 清洗后的 HTML 片段。
 */
export function cleanDoubanPage(html) {
  const { document } = parseHTML(html)

  // 移除 noscript 与外部样式表
  document.querySelectorAll('noscript, link[rel="stylesheet"]').forEach(el => el.remove())

  DOUBAN_REMOVE_SELECTORS.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => el.remove())
  })

  document.querySelectorAll('[class]').forEach(el => {
    if (isAdElement(el)) el.remove()
  })

  // 相对链接绝对化
  document.querySelectorAll('[href], [src]').forEach(el => {
    const href = el.getAttribute('href')
    if (href) el.setAttribute('href', fixUrl(href, DOUBAN_BASE_URL))
    const src = el.getAttribute('src')
    if (src) el.setAttribute('src', fixUrl(src, DOUBAN_BASE_URL))
  })

  const fragment = document.body ? document.body.innerHTML : document.documentElement.innerHTML
  return wrapDocument(fragment)
}

function isChina(c) {
  return (c.env?.CF_IP_COUNTRY || '') === 'CN'
}

/**
 * 生成一个随机的豆瓣 bid Cookie 值（8 位字母数字）。
 * @returns {string}
 */
function makeDoubanBid() {
  return Array.from({ length: 8 }, () =>
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(
      Math.floor(Math.random() * 62)
    )
  ).join('')
}

async function findDoubanMatch(detail) {
  const names = [...new Set([detail.name, detail.name_cn].filter(Boolean))]
  if (!names.length) return null

  for (const name of names) {
    const suggestions = await searchDouban(name)
    if (!suggestions.length) continue
    const match =
      suggestions.find(
        s => s.title === name || s.title === detail.name_cn || s.title === detail.name
      ) || suggestions[0]
    if (match) return match
  }
  return null
}

app.get('/by-name', async c => {
  try {
    const name = c.req.query('name')
    if (!name) return c.json({ data: null })
    const cacheKey = `douban_name_${name}`
    const cached = cache.get(cacheKey)
    if (cached) return c.json({ data: cached })

    // 直接用番名搜豆瓣，不依赖 Bangumi API（避免镜像/被墙影响）
    const suggestions = await searchDouban(name)
    const match = suggestions?.[0]
    if (!match) {
      cache.set(cacheKey, null)
      return c.json({ data: null })
    }
    const abstract = await getDoubanAbstract(match.id)
    const data = {
      id: match.id,
      title: abstract?.title || match.title,
      rate: abstract?.rate || '0',
      star: abstract?.star || 0,
      episodes_count: abstract?.episodes_count || 0,
      release_year: abstract?.release_year || '',
      types: abstract?.types || [],
      short_comment: abstract?.short_comment || null,
      url: `https://movie.douban.com/subject/${match.id}`
    }
    cache.set(cacheKey, data)
    return c.json({ data })
  } catch {
    return c.json({ data: null })
  }
})

app.get('/:id', async c => {
  try {
    const subjectId = c.req.param('id')
    const cn = isChina(c)
    const detail = await bangumiService.getAnimeDetail(subjectId, { isChina: cn })
    if (!detail) return c.json({ data: null })
    const match = await findDoubanMatch(detail)
    if (!match) return c.json({ data: null })
    const abstract = await getDoubanAbstract(match.id)
    return c.json({
      data: {
        id: match.id,
        title: abstract?.title || match.title,
        rate: abstract?.rate || '0',
        star: abstract?.star || 0,
        episodes_count: abstract?.episodes_count || 0,
        release_year: abstract?.release_year || '',
        types: abstract?.types || [],
        short_comment: abstract?.short_comment || null,
        url: `https://movie.douban.com/subject/${match.id}`
      }
    })
  } catch {
    return c.json({ data: null })
  }
})

app.get('/:id/details', async c => {
  try {
    const subjectId = c.req.param('id')
    const cn = isChina(c)
    const cacheKey = `douban_details_${subjectId}_${cn}`
    const cached = cache.get(cacheKey)
    if (cached) return c.json({ data: cached })

    const detail = await bangumiService.getAnimeDetail(subjectId, { isChina: cn })
    if (!detail) return c.json({ data: null })
    const match = await findDoubanMatch(detail)
    if (!match) return c.json({ data: null })

    const abstract = await getDoubanAbstract(match.id)

    const data = {
      id: match.id,
      title: abstract?.title || match.title,
      rate: abstract?.rate || '0',
      star: abstract?.star || 0,
      episodes_count: abstract?.episodes_count || 0,
      release_year: abstract?.release_year || '',
      types: abstract?.types || [],
      short_comment: abstract?.short_comment || null,
      url: `https://movie.douban.com/subject/${match.id}`
    }

    cache.set(cacheKey, data)
    return c.json({ data })
  } catch {
    return c.json({ data: null })
  }
})

app.get('/:id/comments', async c => {
  try {
    const id = c.req.param('id')
    if (!id) return c.json({ error: '缺少ID' }, 400)
    const comments = await getDoubanComments(id)
    return c.json({ data: comments })
  } catch {
    return c.json({ data: [] })
  }
})

app.get('/:id/reviews', async c => {
  try {
    const id = c.req.param('id')
    if (!id) return c.json({ error: '缺少ID' }, 400)
    const reviews = await getDoubanReviews(id)
    return c.json({ data: reviews })
  } catch {
    return c.json({ data: [] })
  }
})

/**
 * 豆瓣条目结构化摘要接口。
 * 返回 title、rate、star、url、intro、keyInfo 等字段；任一环节失败时静默返回可用字段，不抛 500。
 *
 * @route GET /:id/summary
 * @param {string} id - 豆瓣条目 ID。
 * @returns {Response} JSON 摘要对象。
 */
app.get('/:id/summary', async c => {
  try {
    const id = c.req.param('id')
    if (!id) return c.json({ error: '缺少ID' }, 400)
    const summary = await getDoubanSummary(id)
    return c.json({ data: summary })
  } catch {
    return c.json({ data: null })
  }
})

/**
 * 生成豆瓣降级 HTML：当上游抓取失败时返回，包含直达链接与提示。
 * @param {string} id - 豆瓣条目 ID。
 * @returns {string} HTML 片段。
 */
function buildDoubanFallbackHTML(id) {
  const url = `https://movie.douban.com/subject/${id}/`
  return `<div style="text-align:center;padding:2.5rem 1rem;font-family:system-ui,-apple-system,'Segoe UI',sans-serif">
  <div style="display:inline-block;padding:1.5rem 2rem;background:#fff5f6;border:1px solid #ffd6dd;border-radius:12px;max-width:400px">
    <p style="margin:0 0 0.5rem;font-size:1rem;color:#666">豆瓣页面暂无法嵌入</p>
    <p style="margin:0 0 1rem;font-size:0.85rem;color:#999">豆瓣对第三方服务器有访问限制，请直接访问豆瓣查看完整内容</p>
    <a href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:0.5rem 1.25rem;background:#ff6b81;color:#fff;text-decoration:none;border-radius:999px;font-size:0.9rem;font-weight:500">前往豆瓣查看 →</a>
  </div>
</div>`
}

/**
 * 豆瓣条目页面代理。
 * 抓取豆瓣条目页面，移除导航/侧栏/推荐/广告等噪声后返回清洗的 HTML 片段。
 * 保留评分区（#interest_sectl）、短评区（.comment-item）、长评区（.review-item）等核心内容。
 * 使用 5 分钟内存缓存。
 * 抓取失败时返回 200 + 降级 HTML（直达链接），而非 502，保证前端 iframe 正常展示。
 *
 * @route GET /page/:id
 * @param {string} id - 豆瓣条目 ID。
 * @returns {Response} Content-Type 为 text/html; charset=utf-8 的 HTML 片段。
 */
app.get('/page/:id', async c => {
  const id = c.req.param('id')
  if (!id) return c.json({ data: null, error: '缺少ID', code: 400 }, 400)

  const cacheKey = `douban_page_${id}`
  const cached = pageCache.get(cacheKey)
  if (cached) {
    return c.html(cached, 200, { 'Content-Type': 'text/html; charset=utf-8' })
  }

  const url = `https://movie.douban.com/subject/${id}/`
  try {
    const html = await fetchHTML(url, {
      headers: {
        Referer: 'https://movie.douban.com/',
        Cookie: `bid=${makeDoubanBid()}; ll="108288"`
      }
    })
    // 检测是否被反爬拦截（登录页/验证页通常很短或包含特定关键词）
    if (!html || html.length < 1000 || /login|验证|请输入|forbidden|访问受限/i.test(html)) {
      const fallback = buildDoubanFallbackHTML(id)
      return c.html(fallback, 200, { 'Content-Type': 'text/html; charset=utf-8' })
    }
    const fragment = cleanDoubanPage(html)
    if (!fragment || fragment.trim().length < 100) {
      const fallback = buildDoubanFallbackHTML(id)
      return c.html(fallback, 200, { 'Content-Type': 'text/html; charset=utf-8' })
    }
    pageCache.set(cacheKey, fragment)
    return c.html(fragment, 200, { 'Content-Type': 'text/html; charset=utf-8' })
  } catch {
    const fallback = buildDoubanFallbackHTML(id)
    return c.html(fallback, 200, { 'Content-Type': 'text/html; charset=utf-8' })
  }
})

export default app
