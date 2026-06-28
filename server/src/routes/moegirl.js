import { Hono } from 'hono'

const app = new Hono()
const MOEGIRL_CN = 'https://zh.moegirl.org.cn/api.php'
const MOEGIRL_INTL = 'https://zh.moegirl.uk/api.php'

const cache = new Map()
function getCached(key) {
  const c = cache.get(key)
  return (c && Date.now() - c.time < 30 * 60 * 1000) ? c.data : null
}
function setCache(key, data) {
  cache.set(key, { data, time: Date.now() })
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
      'Accept': 'application/json'
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
        'Accept': 'text/html',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      }
    })
    if (!res.ok) return null
    const html = await res.text()

    // 提取 #mw-content-text 的内容
    const contentMatch = html.match(/<div id="mw-content-text"[^>]*>([\s\S]*?)<\/div>\s*(?:<div class="printfooter|<div id="catlinks|<\/body>)/i)
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

app.get('/search', async (c) => {
  try {
    const q = c.req.query('q')
    if (!q) return c.json({ data: { results: [] } })
    const cacheKey = `moesearch_${q}`
    const cached = getCached(cacheKey)
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
    setCache(cacheKey, data)
    return c.json({ data })
  } catch {
    return c.json({ data: { results: [] } })
  }
})

export default app
