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

app.get('/page', async (c) => {
  try {
    const title = c.req.query('title')
    if (!title) return c.json({ data: null })
    const cacheKey = `moepage_${title}`
    const cached = getCached(cacheKey)
    if (cached) return c.json({ data: cached })

    const apiBase = getMoegirlApi(c)
    const params = `action=parse&page=${encodeURIComponent(title)}&prop=text&format=json&disableeditsection=1`
    let json = await fetchMoegirlJSON(apiBase, params)
    if (!json?.parse) {
      const fallback = apiBase === MOEGIRL_CN ? MOEGIRL_INTL : MOEGIRL_CN
      json = await fetchMoegirlJSON(fallback, params)
    }

    const data = {
      title: json?.parse?.title || title,
      html: json?.parse?.text?.['*'] || '',
      pageUrl: `${getMoegirlBase(c)}/${encodeURIComponent(title)}`
    }
    setCache(cacheKey, data)
    return c.json({ data })
  } catch {
    return c.json({ data: null })
  }
})

export default app
