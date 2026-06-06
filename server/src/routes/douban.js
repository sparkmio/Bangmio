import { Hono } from 'hono'
import * as bangumiService from '../services/bangumi.js'
import { searchDouban, getDoubanAbstract } from '../services/douban.js'

const app = new Hono()

app.get('/:id', async (c) => {
  try {
    const subjectId = c.req.param('id')
    const detail = await bangumiService.getAnimeDetail(subjectId)
    const name = detail.name_cn || detail.name
    if (!name) return c.json({ data: null })
    const suggestions = await searchDouban(name)
    const match = suggestions.find(s => s.title === name || s.title === detail.name_cn || s.title === detail.name) || suggestions[0]
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

export default app
