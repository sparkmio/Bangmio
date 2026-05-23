import { Router } from 'express'
import { getClient } from '../services/bangumi.js'

const router = Router()

function extractToken(req) {
  return (req.headers.authorization || '').replace('Bearer ', '')
}

function extractUsername(req) {
  return req.headers['x-bangumi-username'] || ''
}

function bangumiError(err, fallback) {
  const status = err.response?.status
  const detail = err.response?.data
  console.error(`[Bangumi] ${fallback} - status:${status}`, JSON.stringify(detail || err.message))
  if (status === 401) return { code: 401, error: '登录已过期，请重新登录' }
  if (status === 403) return { code: 403, error: '无权限访问' }
  if (status === 404) return { code: 404, error: null }
  return { code: 500, error: detail?.description || detail?.message || fallback }
}

router.get('/list', async (req, res) => {
  try {
    const token = extractToken(req)
    const username = extractUsername(req)
    if (!token) return res.status(401).json({ error: '未登录' })
    if (!username) return res.status(400).json({ error: '缺少用户名' })
    const client = getClient(token)
    const params = { offset: Number(req.query.offset) || 0, limit: Number(req.query.limit) || 30 }
    if (req.query.subject_type) params.subject_type = Number(req.query.subject_type)
    if (req.query.type) params.type = Number(req.query.type)
    const { data } = await client.get(`/v0/users/${username}/collections`, { params })
    res.json({ data: data.data || [], total: data.total || 0 })
  } catch (err) {
    const { code, error } = bangumiError(err, '获取收藏列表失败')
    res.status(code).json({ error })
  }
})

router.get('/stats', async (req, res) => {
  try {
    const token = extractToken(req)
    const username = extractUsername(req)
    if (!token) return res.status(401).json({ error: '未登录' })
    if (!username) return res.status(400).json({ error: '缺少用户名' })
    const client = getClient(token)
    const [wish, collect, doing, on_hold, dropped] = await Promise.all([
      client.get(`/v0/users/${username}/collections`, { params: { type: 1, limit: 1 } }).then(r => r.data.total).catch(() => 0),
      client.get(`/v0/users/${username}/collections`, { params: { type: 2, limit: 1 } }).then(r => r.data.total).catch(() => 0),
      client.get(`/v0/users/${username}/collections`, { params: { type: 3, limit: 1 } }).then(r => r.data.total).catch(() => 0),
      client.get(`/v0/users/${username}/collections`, { params: { type: 4, limit: 1 } }).then(r => r.data.total).catch(() => 0),
      client.get(`/v0/users/${username}/collections`, { params: { type: 5, limit: 1 } }).then(r => r.data.total).catch(() => 0),
    ])
    res.json({ data: { want: wish, completed: collect, watching: doing, on_hold, dropped, total: wish + collect + doing + on_hold + dropped } })
  } catch (err) {
    const { code, error } = bangumiError(err, '获取统计失败')
    res.status(code).json({ error })
  }
})

router.get('/:animeId', async (req, res) => {
  try {
    const token = extractToken(req)
    const username = extractUsername(req)
    if (!token) return res.status(401).json({ error: '未登录' })
    if (!username) return res.status(400).json({ error: '缺少用户名' })
    const client = getClient(token)
    const { data: collection } = await client.get(`/v0/users/${username}/collections/${req.params.animeId}`)
    res.json({
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
    const result = bangumiError(err, '获取收藏状态失败')
    if (result.code === 404) return res.json({ data: null })
    res.status(result.code).json({ error: result.error })
  }
})

router.post('/:animeId', async (req, res) => {
  try {
    const token = extractToken(req)
    const username = extractUsername(req)
    if (!token) return res.status(401).json({ error: '未登录' })
    const client = getClient(token)

    const body = {}
    if (req.body.status !== undefined && req.body.status >= 1) body.type = Number(req.body.status)
    if (req.body.rating !== undefined) body.rate = Number(req.body.rating)
    if (req.body.comment !== undefined && req.body.comment !== null) body.comment = String(req.body.comment)

    if (!body.type) {
      try {
        if (username) {
          const { data: current } = await client.get(`/v0/users/${username}/collections/${req.params.animeId}`)
          if (current?.type) body.type = current.type
        }
      } catch { body.type = 3 }
    }

    console.log(`[Collection] POST /${req.params.animeId} body:`, JSON.stringify(body))
    await client.post(`/v0/users/-/collections/${req.params.animeId}`, body)

    if (username) {
      try {
        const { data: collection } = await client.get(`/v0/users/${username}/collections/${req.params.animeId}`)
        res.json({
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
      } catch {
        res.json({ data: { status: body.type, rating: body.rate || 0, comment: body.comment || '', updated: true } })
      }
    } else {
      res.json({ data: { status: body.type, rating: body.rate || 0, comment: body.comment || '', updated: true } })
    }
  } catch (err) {
    const result = bangumiError(err, '保存收藏失败')
    res.status(result.code).json({ error: result.error })
  }
})

router.delete('/:animeId', async (req, res) => {
  try {
    const token = extractToken(req)
    if (!token) return res.status(401).json({ error: '未登录' })
    const client = getClient(token)
    await client.delete(`/v0/users/-/collections/${req.params.animeId}`)
    res.json({ message: '已删除' })
  } catch (err) {
    const result = bangumiError(err, '删除收藏失败')
    res.status(result.code).json({ error: result.error })
  }
})

export default router
