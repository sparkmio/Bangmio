import { Hono } from 'hono'
import { searchNetEase } from '../services/music.js'
import { createCache } from '../utils/cache.js'
import { CACHE_TTL_DEFAULT } from '../config.js'

const app = new Hono()
const cache = createCache(CACHE_TTL_DEFAULT)

/**
 * GET /api/v1/music/search?q=曲目名
 * 按名称搜索网易云音乐，返回候选曲目列表（id、名称、歌手、封面）。
 * 搜索失败或无结果时返回空数组，前端降级为搜索链接。
 */
app.get('/search', async c => {
  try {
    const q = c.req.query('q')
    if (!q || !q.trim()) {
      return c.json({ data: { results: [] } })
    }

    const cacheKey = `music_search_${q.trim()}`
    const cached = cache.get(cacheKey)
    if (cached) return c.json({ data: { results: cached } })

    const results = await searchNetEase(q.trim(), 10)
    cache.set(cacheKey, results)
    return c.json({ data: { results } })
  } catch {
    return c.json({ data: { results: [] } })
  }
})

export default app
