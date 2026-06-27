import { Hono } from 'hono'
import * as bangumiService from '../services/bangumi.js'
import { searchDouban, getDoubanAbstract } from '../services/douban.js'

const app = new Hono()

const cache = new Map()
function getCached(key) {
  const c = cache.get(key)
  return (c && Date.now() - c.time < 10 * 60 * 1000) ? c.data : null
}
function setCache(key, data) {
  cache.set(key, { data, time: Date.now() })
}

async function findDoubanMatch(detail) {
  const names = [...new Set([detail.name, detail.name_cn].filter(Boolean))]
  if (!names.length) return null

  for (const name of names) {
    const suggestions = await searchDouban(name)
    if (!suggestions.length) continue
    const match = suggestions.find(s => s.title === name || s.title === detail.name_cn || s.title === detail.name) || suggestions[0]
    if (match) return match
  }
  return null
}

app.get('/:id', async (c) => {
  try {
    const subjectId = c.req.param('id')
    const detail = await bangumiService.getAnimeDetail(subjectId)
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

app.get('/:id/details', async (c) => {
  try {
    const subjectId = c.req.param('id')
    const cacheKey = `douban_details_${subjectId}`
    const cached = getCached(cacheKey)
    if (cached) return c.json({ data: cached })

    const detail = await bangumiService.getAnimeDetail(subjectId)
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

    setCache(cacheKey, data)
    return c.json({ data })
  } catch {
    return c.json({ data: null })
  }
})

export default app
