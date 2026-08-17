import { Hono } from 'hono'
import { getClient } from '../services/bangumi.js'
import { verifyBangumiUsername } from '../services/userVerify.js'
import { upstreamError } from '../utils/errors.js'

const app = new Hono()

function isChina(c) {
  return (c.env?.CF_IP_COUNTRY || '') === 'CN'
}

function extractToken(c) {
  return (c.req.header('Authorization') || '').replace('Bearer ', '')
}

function extractUsername(c) {
  return c.req.header('X-Bangumi-Username') || ''
}

const COLLECTION_STATUS = new Set([1, 2, 3, 4, 5])

function parseBoundedInteger(value, { min, max, fallback = null }) {
  if (value === undefined || value === null || value === '') return fallback
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < min || (max !== undefined && parsed > max))
    return null
  return parsed
}

function parseAnimeId(value) {
  return parseBoundedInteger(value, { min: 1, max: Number.MAX_SAFE_INTEGER })
}

/**
 * 验证直登请求 username 与 token 的绑定关系（PROJECT_ISSUES 7.2，
 * 防止伪造 X-Bangumi-Username 头读取他人收藏）。
 * @returns {Promise<Response | null>} null = 通过；Response = 拒绝响应（调用方直接返回）。
 */
async function guardUsername(c, token, username) {
  const ok = await verifyBangumiUsername(token, username, isChina(c))
  if (!ok) return c.json({ error: '用户名与令牌不匹配' }, 403)
  return null
}

app.get('/list', async c => {
  try {
    const token = extractToken(c)
    const username = extractUsername(c)
    if (!token) return c.json({ error: '未登录' }, 401)
    if (!username) return c.json({ error: '缺少用户名' }, 400)
    const guard = await guardUsername(c, token, username)
    if (guard) return guard
    const client = getClient(token, isChina(c))
    const offset = parseBoundedInteger(c.req.query('offset'), {
      min: 0,
      max: 10000000,
      fallback: 0
    })
    const limit = parseBoundedInteger(c.req.query('limit'), { min: 1, max: 100, fallback: 30 })
    // subject_type 和 type 是可选筛选项。此前缺省值被当成非法值，导致
    // 任一不带这两个筛选项之一的列表请求直接返回 400。
    const subjectTypeRaw = c.req.query('subject_type')
    const typeRaw = c.req.query('type')
    const subjectType =
      subjectTypeRaw === undefined
        ? undefined
        : parseBoundedInteger(subjectTypeRaw, { min: 1, max: 7 })
    const type =
      typeRaw === undefined ? undefined : parseBoundedInteger(typeRaw, { min: 1, max: 5 })
    if (offset === null || limit === null || subjectType === null || type === null) {
      return c.json({ error: '收藏列表参数不合法' }, 400)
    }
    const params = { offset, limit }
    if (subjectType !== undefined) params.subject_type = subjectType
    if (type !== undefined) params.type = type
    const data = await client.get(`/v0/users/${username}/collections`, params)
    return c.json({ data: data.data || [], total: data.total || 0 })
  } catch (err) {
    const r = upstreamError(err.response?.status, err.response?.data, '获取收藏列表失败')
    return c.json({ error: r.error }, r.code)
  }
})

app.get('/stats', async c => {
  try {
    const token = extractToken(c)
    const username = extractUsername(c)
    if (!token) return c.json({ error: '未登录' }, 401)
    if (!username) return c.json({ error: '缺少用户名' }, 400)
    const guard = await guardUsername(c, token, username)
    if (guard) return guard
    const client = getClient(token, isChina(c))
    const fetchTotal = type =>
      client
        .get(`/v0/users/${username}/collections`, { type, limit: 1 })
        .then(r => r.total)
        .catch(() => 0)
    const [wish, collect, doing, on_hold, dropped] = await Promise.all([
      fetchTotal(1),
      fetchTotal(2),
      fetchTotal(3),
      fetchTotal(4),
      fetchTotal(5)
    ])
    return c.json({
      data: {
        want: wish,
        completed: collect,
        watching: doing,
        on_hold,
        dropped,
        total: wish + collect + doing + on_hold + dropped
      }
    })
  } catch (err) {
    const r = upstreamError(err.response?.status, err.response?.data, '获取统计失败')
    return c.json({ error: r.error }, r.code)
  }
})

app.get('/:animeId', async c => {
  try {
    const token = extractToken(c)
    const username = extractUsername(c)
    if (!token) return c.json({ error: '未登录' }, 401)
    if (!username) return c.json({ error: '缺少用户名' }, 400)
    const guard = await guardUsername(c, token, username)
    if (guard) return guard
    const animeId = parseAnimeId(c.req.param('animeId'))
    if (animeId === null) return c.json({ error: '番剧 ID 不合法' }, 400)
    const client = getClient(token, isChina(c))
    const collection = await client.get(`/v0/users/${username}/collections/${animeId}`)
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
    const r = upstreamError(err.response?.status, err.response?.data, '获取收藏状态失败')
    if (r.code === 404) return c.json({ data: null })
    return c.json({ error: r.error }, r.code)
  }
})

app.post('/:animeId', async c => {
  try {
    const token = extractToken(c)
    const username = extractUsername(c)
    if (!token) return c.json({ error: '未登录' }, 401)
    if (username) {
      const guard = await guardUsername(c, token, username)
      if (guard) return guard
    }
    const animeId = parseAnimeId(c.req.param('animeId'))
    if (animeId === null) return c.json({ error: '番剧 ID 不合法' }, 400)
    const client = getClient(token, isChina(c))
    const body = await c.req.json().catch(() => ({}))
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return c.json({ error: '请求参数不合法' }, 400)
    }

    const payload = {}
    if (body.status !== undefined) {
      const status = parseBoundedInteger(body.status, { min: 1, max: 5 })
      if (status === null || !COLLECTION_STATUS.has(status)) {
        return c.json({ error: '收藏状态不合法' }, 400)
      }
      payload.type = status
    }
    if (body.rating !== undefined) {
      const rating = parseBoundedInteger(body.rating, { min: 0, max: 10 })
      if (rating === null) return c.json({ error: '评分必须是 0 到 10 的整数' }, 400)
      payload.rate = rating
    }
    if (body.comment !== undefined && body.comment !== null) {
      const comment = String(body.comment)
      if (comment.length > 2000) return c.json({ error: '评论不能超过 2000 个字符' }, 400)
      payload.comment = comment
    }

    if (!payload.type) {
      // status 未显式提供：尝试获取当前状态以保留原值
      if (username) {
        try {
          const current = await client.get(`/v0/users/${username}/collections/${animeId}`)
          if (current?.type) {
            payload.type = current.type
          } else {
            // 当前无收藏记录，且用户未指定 status，拒绝创建默认状态
            return c.json({ error: '请先选择收藏状态' }, 400)
          }
        } catch (err) {
          // 查询失败（多为 404 未收藏），且用户未指定 status
          if (err?.response?.status === 404) {
            return c.json({ error: '请先选择收藏状态' }, 400)
          }
          // 其他查询错误也拒绝盲写
          return c.json({ error: '无法确认当前收藏状态，请先选择收藏状态' }, 400)
        }
      } else {
        // 无 username，无法确认状态
        return c.json({ error: '请先选择收藏状态' }, 400)
      }
    }
    await client.post(`/v0/users/-/collections/${animeId}`, payload)

    if (username) {
      try {
        const collection = await client.get(`/v0/users/${username}/collections/${animeId}`)
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
      } catch {
        return c.json({
          data: {
            status: payload.type,
            rating: payload.rate || 0,
            comment: payload.comment || '',
            updated: true
          }
        })
      }
    } else {
      return c.json({
        data: {
          status: payload.type,
          rating: payload.rate || 0,
          comment: payload.comment || '',
          updated: true
        }
      })
    }
  } catch (err) {
    const r = upstreamError(err.response?.status, err.response?.data, '保存收藏失败')
    return c.json({ error: r.error }, r.code)
  }
})

app.delete('/:animeId', async c => {
  try {
    const token = extractToken(c)
    if (!token) return c.json({ error: '未登录' }, 401)
    const animeId = parseAnimeId(c.req.param('animeId'))
    if (animeId === null) return c.json({ error: '番剧 ID 不合法' }, 400)
    const client = getClient(token, isChina(c))
    await client.delete(`/v0/users/-/collections/${animeId}`)
    return c.json({ message: '已删除' })
  } catch (err) {
    const r = upstreamError(err.response?.status, err.response?.data, '删除收藏失败')
    return c.json({ error: r.error }, r.code)
  }
})

export default app
