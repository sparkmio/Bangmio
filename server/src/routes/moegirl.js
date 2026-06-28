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
  // 用 action=parse 获取完整渲染 HTML，排版正常（extracts 返回纯文本/不完整）
  const params = `action=parse&page=${encodeURIComponent(title)}&prop=text&format=json&disablelimitreport=1&disabletoc=1`
  const json = await fetchMoegirlJSON(apiBase, params)
  const html = json?.parse?.text?.['*']
  if (!html) {
    // fallback：旧 extracts 方式
    const params2 = `action=query&titles=${encodeURIComponent(title)}&prop=extracts&format=json`
    const json2 = await fetchMoegirlJSON(apiBase, params2)
    if (!json2?.query?.pages) return null
    const pages = Object.values(json2.query.pages)
    if (!pages[0]?.extract) return null
    return { title: pages[0].title, html: pages[0].extract }
  }
  // 清理无关内容：脚本/样式/编辑链接/目录/分类
  let clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<span class="mw-editsection">[\s\S]*?<\/span>/gi, '')
    .replace(/<div id="toc"[\s\S]*?<\/div>\s*<\/div>/gi, '')
    .replace(/<div class="toc[\s\S]*?<\/div>\s*<\/div>/gi, '')
    .replace(/<div id="catlinks"[\s\S]*?<\/div>/gi, '')
    .replace(/<table class="navbox[\s\S]*?<\/table>/gi, '')
  return {
    title: json.parse.title || title,
    html: clean
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
