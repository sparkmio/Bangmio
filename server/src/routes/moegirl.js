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

app.get('/search', async (c) => {
  try {
    const q = c.req.query('q')
    if (!q) return c.json({ data: [] })
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

    setCache(cacheKey, results)
    return c.json({ data: results })
  } catch {
    return c.json({ data: [] })
  }
})

app.get('/proxy', async (c) => {
  try {
    const raw = c.req.query('url')
    if (!raw) return c.json({ error: 'no url' }, 400)
    const url = decodeURIComponent(raw)

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      }
    })
    if (!res.ok) return c.text('Failed to fetch', { status: 502 })

    let html = await res.text()
    const origin = new URL(url).origin
    html = html.replace('<head>', `<head><base href="${origin}/">`)

    const headers = new Headers()
    headers.set('Content-Type', 'text/html; charset=utf-8')
    return new Response(html, { headers })
  } catch (e) {
    return c.text('Proxy error: ' + String(e), { status: 500 })
  }
})

export default app
