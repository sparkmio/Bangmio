import { Hono } from 'hono'
import { getClient } from '../services/bangumi.js'

const app = new Hono()

function extractToken(c) {
  return (c.req.header('Authorization') || '').replace('Bearer ', '')
}

function extractUsername(c) {
  return c.req.header('X-Bangumi-Username') || ''
}

function errorResult(status, detail, fallback) {
  if (status === 401) return { code: 401, error: '登录已过期，请重新登录' }
  if (status === 403) return { code: 403, error: '无权限访问' }
  if (status === 404) return { code: 404, error: null }
  return { code: 500, error: detail?.description || detail?.message || fallback }
}

app.get('/list', async (c) => {
  try {
    const token = extractToken(c)
    const username = extractUsername(c)
    if (!token) return c.json({ error: '未登录' }, 401)
    if (!username) return c.json({ error: '缺少用户名' }, 400)
    const client = getClient(token)
    const params = { offset: Number(c.req.query('offset')) || 0, limit: Number(c.req.query('limit')) || 30 }
    const st = c.req.query('subject_type')
    const t = c.req.query('type')
    if (st) params.subject_type = Number(st)
    if (t) params.type = Number(t)
    const data = await client.get(`/v0/users/${username}/collections`, params)
    return c.json({ data: data.data || [], total: data.total || 0 })
  } catch (err) {
    const r = errorResult(err.response?.status, err.response?.data, '获取收藏列表失败')
    return c.json({ error: r.error }, r.code)
  }
})

app.get('/stats', async (c) => {
  try {
    const token = extractToken(c)
    const username = extractUsername(c)
    if (!token) return c.json({ error: '未登录' }, 401)
    if (!username) return c.json({ error: '缺少用户名' }, 400)
    const client = getClient(token)
    const fetchTotal = (type) => client.get(`/v0/users/${username}/collections`, { type, limit: 1 }).then(r => r.total).catch(() => 0)
    const [wish, collect, doing, on_hold, dropped] = await Promise.all([
      fetchTotal(1), fetchTotal(2), fetchTotal(3), fetchTotal(4), fetchTotal(5)
    ])
    return c.json({ data: { want: wish, completed: collect, watching: doing, on_hold, dropped, total: wish + collect + doing + on_hold + dropped } })
  } catch (err) {
    const r = errorResult(err.response?.status, err.response?.data, '获取统计失败')
    return c.json({ error: r.error }, r.code)
  }
})

app.get('/:animeId', async (c) => {
  try {
    const token = extractToken(c)
    const username = extractUsername(c)
    if (!token) return c.json({ error: '未登录' }, 401)
    if (!username) return c.json({ error: '缺少用户名' }, 400)
    const client = getClient(token)
    const collection = await client.get(`/v0/users/${username}/collections/${c.req.param('animeId')}`)
    return c.json({
      data: {
        anime_id: collection.subject_id,
        status: collection.type,
        rating: collection.rate || 0,
        comment: collection.comment || '',
        episode: collection.ep_status || 0,
        subject: collection.subject || null,
        updated_at: collection.updated_at
      }
    })
  } catch (err) {
    const r = errorResult(err.response?.status, err.response?.data, '获取收藏状态失败')
    if (r.code === 404) return c.json({ data: null })
    return c.json({ error: r.error }, r.code)
  }
})

app.post('/:animeId', async (c) => {
  try {
    const token = extractToken(c)
    const username = extractUsername(c)
    if (!token) return c.json({ error: '未登录' }, 401)
    const client = getClient(token)
    const body = await c.req.json()

    const payload = {}
    if (body.status !== undefined && body.status >= 1) payload.type = Number(body.status)
    if (body.rating !== undefined) payload.rate = Number(body.rating)
    if (body.comment !== undefined && body.comment !== null) payload.comment = String(body.comment)

    if (!payload.type) {
      try {
        if (username) {
          const current = await client.get(`/v0/users/${username}/collections/${c.req.param('animeId')}`)
          if (current?.type) payload.type = current.type
        }
      } catch { payload.type = 3 }
    }
    await client.post(`/v0/users/-/collections/${c.req.param('animeId')}`, payload)

    if (username) {
      try {
        const collection = await client.get(`/v0/users/${username}/collections/${c.req.param('animeId')}`)
        return c.json({
          data: {
            anime_id: collection.subject_id, status: collection.type,
            rating: collection.rate || 0, comment: collection.comment || '',
            episode: collection.ep_status || 0, subject: collection.subject || null,
            updated_at: collection.updated_at
          }
        })
      } catch {
        return c.json({ data: { status: payload.type, rating: payload.rate || 0, comment: payload.comment || '', updated: true } })
      }
    } else {
      return c.json({ data: { status: payload.type, rating: payload.rate || 0, comment: payload.comment || '', updated: true } })
    }
  } catch (err) {
    const r = errorResult(err.response?.status, err.response?.data, '保存收藏失败')
    return c.json({ error: r.error }, r.code)
  }
})

app.delete('/:animeId', async (c) => {
  try {
    const token = extractToken(c)
    if (!token) return c.json({ error: '未登录' }, 401)
    const client = getClient(token)
    await client.delete(`/v0/users/-/collections/${c.req.param('animeId')}`)
    return c.json({ message: '已删除' })
  } catch (err) {
    const r = errorResult(err.response?.status, err.response?.data, '删除收藏失败')
    return c.json({ error: r.error }, r.code)
  }
})

export default app
