import { Hono } from 'hono'
import * as bangumiService from '../services/bangumi.js'

const app = new Hono()

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function generateBuvid3() {
  const seg = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0')
  return `${seg()}${seg()}-${seg()}-${seg()}-${seg()}-${seg()}${seg()}${seg()}infoc`
}

const BILIBILI_HEADERS = {
  'User-Agent': UA,
  'Referer': 'https://search.bilibili.com/',
  'Origin': 'https://search.bilibili.com',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Cookie': `buvid3=${generateBuvid3()}; b_nut=${Date.now()}`
}

const cache = new Map()
function getCached(key) {
  const c = cache.get(key)
  return (c && Date.now() - c.time < 10 * 60 * 1000) ? c.data : null
}
function setCache(key, data) {
  cache.set(key, { data, time: Date.now() })
}

function isChina(c) {
  return (c.env?.CF_IP_COUNTRY || '') === 'CN'
}

function stripTags(s) {
  return (s || '').replace(/<[^>]+>/g, '').trim()
}

async function searchBilibiliBangumi(name) {
  if (!name) return null
  const url = `https://api.bilibili.com/x/web-interface/search/type?search_type=media_bangumi&keyword=${encodeURIComponent(name)}`
  const res = await fetch(url, { headers: BILIBILI_HEADERS })
  if (!res.ok) return null
  const json = await res.json()
  if (json.code !== 0) return null
  const result = json.data?.result?.[0]
  if (!result) return null
  return {
    title: stripTags(result.title),
    season_id: result.season_id,
    media_id: result.media_id,
    url: result.link || `https://www.bilibili.com/bangumi/media/md${result.media_id}`,
    cover: result.cover,
    score: result.media_score?.score != null ? Number(result.media_score.score) : null,
    score_count: result.media_score?.user_count,
    episodes: result.eps,
    pub_time: result.pub_time
  }
}

async function findBilibiliMatch(detail) {
  const names = [...new Set([detail.name_cn, detail.name].filter(Boolean))]
  if (!names.length) return null
  for (const name of names) {
    const match = await searchBilibiliBangumi(name)
    if (match) return match
  }
  return null
}

app.get('/by-name', async (c) => {
  try {
    const name = c.req.query('name')
    if (!name) return c.json({ data: null })
    const cacheKey = `bilibili_name_${name}`
    const cached = getCached(cacheKey)
    if (cached) return c.json({ data: cached })

    const match = await searchBilibiliBangumi(name)
    setCache(cacheKey, match || null)
    return c.json({ data: match || null })
  } catch {
    return c.json({ data: null })
  }
})

app.get('/:id', async (c) => {
  try {
    const subjectId = c.req.param('id')
    const cn = isChina(c)
    const cacheKey = `bilibili_${subjectId}_${cn}`
    const cached = getCached(cacheKey)
    if (cached) return c.json({ data: cached })

    const detail = await bangumiService.getAnimeDetail(subjectId, { isChina: cn })
    if (!detail) return c.json({ data: null })
    const match = await findBilibiliMatch(detail)
    setCache(cacheKey, match || null)
    return c.json({ data: match || null })
  } catch {
    return c.json({ data: null })
  }
})

app.get('/:id/details', async (c) => {
  return c.redirect(`/api/v1/bilibili/${c.req.param('id')}`, 307)
})

export default app
