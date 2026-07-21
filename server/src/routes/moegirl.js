import { Hono } from 'hono'
import { parseHTML } from 'linkedom'
import { createCache } from '../utils/cache.js'
import { fetchHTML } from '../utils/http.js'
import { CACHE_TTL_MOEGIRL } from '../config.js'

const app = new Hono()
const MOEGIRL_CN = 'https://zh.moegirl.org.cn/api.php'
const MOEGIRL_INTL = 'https://zh.moegirl.uk/api.php'

const cache = createCache(CACHE_TTL_MOEGIRL)

/** 需要从萌娘百科页面移除的选择器列表 */
const MOEGIRL_REMOVE_SELECTORS = [
  '.header',
  '.footer',
  '#mw-navigation',
  '.sidebar',
  '.mw-editsection',
  'iframe',
  'script',
  'style'
]

/**
 * 判断元素的 class 是否包含广告类标识（ad/promo/banner）。
 * 使用边界匹配避免误删含 "ad" 子串的正常类名。
 * @param {Element} el - DOM 元素。
 * @returns {boolean} 若 class 含广告标识返回 true，否则 false。
 */
function isAdElement(el) {
  const cls = el.getAttribute('class') || ''
  if (!cls) return false
  return /(^|[\s_-])(ad|advert|advertisement|promo|promotion|banner)/i.test(cls)
}

/**
 * 清洗萌娘百科页面 HTML：移除导航、页脚、侧栏、编辑按钮、脚本、样式及广告元素。
 * 优先保留 .mw-parser-output 内容，若不存在则保留整个 body。
 * @param {string} html - 原始页面 HTML。
 * @returns {string} 清洗后的 HTML 片段。
 */
export function cleanMoegirlPage(html) {
  const { document } = parseHTML(html)

  MOEGIRL_REMOVE_SELECTORS.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => el.remove())
  })

  document.querySelectorAll('[class]').forEach(el => {
    if (isAdElement(el)) el.remove()
  })

  const parserOutput = document.querySelector('.mw-parser-output')
  if (parserOutput) return parserOutput.innerHTML
  return document.body ? document.body.innerHTML : ''
}

function getMoegirlApi(c) {
  const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
  return isChina ? MOEGIRL_CN : MOEGIRL_INTL
}

function getMoegirlBase(c) {
  const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
  return isChina ? 'https://zh.moegirl.org.cn' : 'https://zh.moegirl.uk'
}

async function fetchMoegirlJSON(apiBase, params) {
  const url = `${apiBase}?${params}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Bangmio/1.0',
      Accept: 'application/json'
    }
  })
  if (!res.ok) return null
  return await res.json()
}

function parseSearchResults(json) {
  const results = []
  if (!Array.isArray(json) || json.length < 4) return results
  const titles = json[1] || []
  const descs = json[2] || []
  const urls = json[3] || []
  titles.forEach((t, i) => {
    results.push({
      title: t,
      description: descs[i] || '',
      url: urls[i] || '',
      pageName: encodeURIComponent(t)
    })
  })
  return results
}

async function fetchPageExtract(apiBase, title) {
  // apiBase 是 https://zh.moegirl.org.cn/api.php 或 https://zh.moegirl.uk/api.php
  const base = apiBase.replace('/api.php', '')
  const pageUrl = `${base}/${encodeURIComponent(title)}`

  try {
    const res = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Bangmio/1.0 (Mozilla/5.0; compatible)',
        Accept: 'text/html',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      }
    })
    if (!res.ok) return null
    const html = await res.text()

    // 提取 #mw-content-text 的内容
    const contentMatch = html.match(
      /<div id="mw-content-text"[^>]*>([\s\S]*?)<\/div>\s*(?:<div class="printfooter|<div id="catlinks|<\/body>)/i
    )
    if (!contentMatch) return null

    let clean = contentMatch[1]
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<span class="mw-editsection">[\s\S]*?<\/span>/gi, '')

    // 链接绝对化
    clean = clean.replace(/href="\/wiki\//g, `href="${base}/wiki/`)
    clean = clean.replace(/href="\//g, `href="${base}/`)
    clean = clean.replace(/src="\//g, `src="${base}/`)

    return {
      title,
      html: clean
    }
  } catch {
    return null
  }
}

app.get('/search', async c => {
  try {
    const q = c.req.query('q')
    if (!q) return c.json({ data: { results: [] } })
    const cacheKey = `moesearch_${q}`
    const cached = cache.get(cacheKey)
    if (cached) return c.json({ data: cached })

    const apiBase = getMoegirlApi(c)
    const params = `action=opensearch&search=${encodeURIComponent(q)}&limit=5&format=json`
    let json = await fetchMoegirlJSON(apiBase, params)
    let results = parseSearchResults(json)

    if (!results.length) {
      const fallback = apiBase === MOEGIRL_CN ? MOEGIRL_INTL : MOEGIRL_CN
      json = await fetchMoegirlJSON(fallback, params)
      results = parseSearchResults(json)
    }

    let page = null
    if (results.length) {
      const extract = await fetchPageExtract(apiBase, results[0].title)
      if (extract) {
        page = {
          title: extract.title,
          html: extract.html,
          url: `${getMoegirlBase(c)}/${encodeURIComponent(results[0].title)}`
        }
      }
    }

    const data = { results, page }
    cache.set(cacheKey, data)
    return c.json({ data })
  } catch {
    return c.json({ data: { results: [] } })
  }
})

/**
 * 判断返回的 HTML 是否为萌娘百科的反爬/JS 检测页（非真实内容）。
 * 特征：包含 "JavaScript enabled" 提示、长度过短、或主要是 noscript 标签。
 * @param {string} html - 抓取返回的 HTML。
 * @returns {boolean} 若为反爬页返回 true。
 */
function isMoegirlBlockPage(html) {
  if (!html) return true
  if (html.length < 2000) {
    if (/JavaScript enabled|requires JavaScript|check your browser settings/i.test(html)) {
      return true
    }
    // 短页面且不含萌娘百科核心标识
    if (html.length < 500 && !/mw-parser-output|mw-content-text|moegirl/i.test(html)) {
      return true
    }
  }
  return false
}

/**
 * 生成萌娘百科降级 HTML：当上游抓取失败或返回反爬页时使用，包含直达链接与提示。
 * @param {string} name - 萌娘百科页面名（已解码）。
 * @returns {string} HTML 片段。
 */
function buildMoegirlFallbackHTML(name) {
  const encoded = encodeURIComponent(name)
  const url = `https://zh.moegirl.org.cn/${encoded}`
  const ukUrl = `https://zh.moegirl.uk/${encoded}`
  return `<div style="text-align:center;padding:2.5rem 1rem;font-family:system-ui,-apple-system,'Segoe UI',sans-serif">
  <div style="display:inline-block;padding:1.5rem 2rem;background:#fff5f6;border:1px solid #ffd6dd;border-radius:12px;max-width:420px">
    <p style="margin:0 0 0.5rem;font-size:1rem;color:#666">萌娘百科页面暂无法嵌入</p>
    <p style="margin:0 0 1rem;font-size:0.85rem;color:#999">萌娘百科对第三方服务器有访问限制，请直接访问查看完整内容</p>
    <div style="display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap">
      <a href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:0.5rem 1.25rem;background:#ff6b81;color:#fff;text-decoration:none;border-radius:999px;font-size:0.9rem;font-weight:500">萌娘百科（国内）→</a>
      <a href="${ukUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:0.5rem 1.25rem;background:#fff;color:#ff6b81;border:1px solid #ff6b81;text-decoration:none;border-radius:999px;font-size:0.9rem;font-weight:500">萌娘百科（海外）→</a>
    </div>
  </div>
</div>`
}

/**
 * 萌娘百科页面代理。
 * 抓取指定页面名的萌娘百科页面，仅保留 .mw-parser-output 内容（不存在则保留整个 body），
 * 移除导航/页脚/侧栏/编辑按钮/脚本/样式/广告后返回清洗的 HTML 片段。
 * 使用 30 分钟内存缓存。
 * 优先抓取国内源（zh.moegirl.org.cn），失败或检测到反爬页时尝试海外源（zh.moegirl.uk），
 * 全部失败时返回 200 + 降级 HTML（直达链接），而非 502，保证前端 iframe 正常展示。
 *
 * @route GET /page/:name
 * @param {string} name - 萌娘百科页面名（URL 编码，会自动解码）。
 * @returns {Response} Content-Type 为 text/html; charset=utf-8 的 HTML 片段。
 */
app.get('/page/:name', async c => {
  const rawName = c.req.param('name')
  let name
  try {
    name = decodeURIComponent(rawName)
  } catch {
    name = rawName
  }
  if (!name) return c.json({ data: null, error: '缺少页面名', code: 400 }, 400)

  const cacheKey = `moegirl_page_${name}`
  const cached = cache.get(cacheKey)
  if (cached) {
    return c.html(cached, 200, { 'Content-Type': 'text/html; charset=utf-8' })
  }

  const encoded = encodeURIComponent(name)
  const candidates = [`https://zh.moegirl.org.cn/${encoded}`, `https://zh.moegirl.uk/${encoded}`]

  for (const url of candidates) {
    try {
      const html = await fetchHTML(url, {
        headers: {
          Referer: 'https://zh.moegirl.org.cn/',
          'Cache-Control': 'no-cache'
        }
      })
      if (isMoegirlBlockPage(html)) continue
      const fragment = cleanMoegirlPage(html)
      if (!fragment || fragment.trim().length < 100) continue
      cache.set(cacheKey, fragment)
      return c.html(fragment, 200, { 'Content-Type': 'text/html; charset=utf-8' })
    } catch {
      // 当前源失败，尝试下一个
    }
  }

  // 所有源均失败，返回降级 HTML
  const fallback = buildMoegirlFallbackHTML(name)
  return c.html(fallback, 200, { 'Content-Type': 'text/html; charset=utf-8' })
})

export default app
