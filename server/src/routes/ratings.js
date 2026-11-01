import { Hono } from 'hono'
import { getOtherRatings } from '../services/otherRatings.js'

const app = new Hono()

app.get('/other', async c => {
  const rawMalId = c.req.query('mal_id') || ''
  const rawImdbId = c.req.query('imdb_id') || ''
  const titles = [
    ...new Set((c.req.queries('title') || []).map(title => title.trim()).filter(Boolean))
  ]
    .filter(title => title.length <= 120)
    .slice(0, 5)
  const year = c.req.query('year') || ''
  const malId = /^\d{1,10}$/.test(rawMalId) && Number(rawMalId) > 0 ? rawMalId : ''
  const imdbId = /^tt\d{5,12}$/i.test(rawImdbId) ? rawImdbId.toLowerCase() : ''
  if ((rawMalId && !malId) || (rawImdbId && !imdbId))
    return c.json({ error: '外部条目编号不合法' }, 400)
  if (year && !/^\d{4}$/.test(year)) return c.json({ error: '年份不合法' }, 400)
  const result = await getOtherRatings({ malId, imdbId, titles, year })
  return c.json(result)
})

export default app
