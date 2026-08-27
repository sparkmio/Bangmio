import { Hono } from 'hono'
import { parseHTML } from 'linkedom'
import { createCache } from '../utils/cache.js'
import { fetchHTML, fixUrl, stripTags } from '../utils/http.js'

const app = new Hono()
const cache = createCache(30 * 60 * 1000)
const WIKIPEDIA_BASE = 'https://zh.wikipedia.org'
const WIKIPEDIA_API = `${WIKIPEDIA_BASE}/w/api.php`

const PAGE_CSS = `
* { box-sizing: border-box; }
body { margin: 0; padding: 1rem; color: #202122; background: #fff; font: 16px/1.7 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
img { max-width: 100%; height: auto; }
table { display: block; width: 100%; max-width: 100%; overflow-x: auto; border-collapse: collapse; }
td, th { border: 1px solid #c8ccd1; padding: .4rem .6rem; }
th { background: #eaecf0; }
a { color: #3366cc; text-decoration: none; word-break: break-word; }
a:hover { text-decoration: underline; }
.infobox { float: right; clear: right; max-width: 100%; margin: 0 0 1rem 1rem; }
@media (max-width: 640px) { .infobox { float: none; margin: 0 0 1rem; } }
`

const REMOVE_SELECTORS = [
  'script',
  'style',
  'noscript',
  '.mw-editsection',
  '.noprint',
  '.mw-jump-link',
  '.mw-indicators',
  '.navigation-not-searchable',
  '.navbox',
  '.vertical-navbox',
  '.sistersitebox',
  '.metadata',
  '.ambox',
  '.shortdescription'
]

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function articleUrl(title) {
  return `${WIKIPEDIA_BASE}/wiki/${encodeURIComponent(title)}`
}

function wrapDocument(fragment, title = '维基百科') {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<base target="_blank">
<title>${escapeHtml(title)}</title>
<style>${PAGE_CSS}</style>
</head>
<body>${fragment}</body>
</html>`
}

function fallbackPage(title) {
  const url = articleUrl(title)
  return wrapDocument(
    `<main style="max-width:42rem;margin:3rem auto;text-align:center">
  <h1>维基百科页面暂时无法加载</h1>
  <p>可以直接前往维基百科查看完整词条。</p>
  <p><a href="${url}" rel="noopener noreferrer">打开「${escapeHtml(title)}」↗</a></p>
</main>`,
    title
  )
}

/**
 * 清洗 MediaWiki 的正文 HTML，并将相对资源地址改为绝对地址。
 * @param {string} html
 * @returns {string}
 */
export function cleanWikipediaPage(html) {
  const source = /<body[\s>]/i.test(html)
    ? html
    : `<!DOCTYPE html><html><body>${html}</body></html>`
  const { document } = parseHTML(source)
  REMOVE_SELECTORS.forEach(selector =>
    document.querySelectorAll(selector).forEach(el => el.remove())
  )
  document.querySelectorAll('[href], [src]').forEach(el => {
    const href = el.getAttribute('href')
    if (href) el.setAttribute('href', fixUrl(href, WIKIPEDIA_BASE))
    const src = el.getAttribute('src')
    if (src) el.setAttribute('src', fixUrl(src, WIKIPEDIA_BASE))
  })
  return document.body?.innerHTML || ''
}

async function wikipediaApi(params) {
  const url = new URL(WIKIPEDIA_API)
  Object.entries({ format: 'json', origin: '*', ...params }).forEach(([key, value]) => {
    if (value != null) url.searchParams.set(key, String(value))
  })
  const text = await fetchHTML(url.toString(), {
    timeout: 9000,
    retries: 0,
    headers: { Accept: 'application/json' }
  })
  return JSON.parse(text)
}

app.get('/search', async c => {
  const q = String(c.req.query('q') || '').trim()
  if (!q) return c.json({ data: { results: [] }, code: 200 })

  const cacheKey = `wikipedia_search_${q}`
  const cached = cache.get(cacheKey)
  if (cached) return c.json({ data: cached, code: 200 })

  try {
    const data = await wikipediaApi({
      action: 'query',
      list: 'search',
      srsearch: q,
      srlimit: 5,
      srnamespace: 0
    })
    const results = (data?.query?.search || []).map(item => ({
      title: item.title,
      description: stripTags(item.snippet || ''),
      url: articleUrl(item.title)
    }))
    const payload = { results }
    cache.set(cacheKey, payload)
    return c.json({ data: payload, code: 200 })
  } catch {
    return c.json({ data: { results: [] }, code: 200 })
  }
})

app.get('/page/:title', async c => {
  const rawTitle = c.req.param('title')
  let title
  try {
    title = decodeURIComponent(rawTitle)
  } catch {
    title = rawTitle
  }
  title = String(title || '').trim()
  if (!title)
    return c.html(fallbackPage('维基百科'), 400, { 'Content-Type': 'text/html; charset=utf-8' })

  const cacheKey = `wikipedia_page_${title}`
  const cached = cache.get(cacheKey)
  if (cached) return c.html(cached, 200, { 'Content-Type': 'text/html; charset=utf-8' })

  try {
    const data = await wikipediaApi({
      action: 'parse',
      page: title,
      prop: 'text|displaytitle',
      formatversion: 2,
      redirects: 1
    })
    const fragment = cleanWikipediaPage(data?.parse?.text || '')
    if (!fragment.trim()) throw new Error('empty Wikipedia page')
    const html = wrapDocument(fragment, stripTags(data?.parse?.displaytitle || title))
    cache.set(cacheKey, html)
    return c.html(html, 200, { 'Content-Type': 'text/html; charset=utf-8' })
  } catch {
    return c.html(fallbackPage(title), 200, { 'Content-Type': 'text/html; charset=utf-8' })
  }
})

export default app
