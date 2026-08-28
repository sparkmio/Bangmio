import * as bangumiService from '../services/bangumi.js'
import { parseBoundedInteger, parsePositiveId } from '../utils/validation.js'

function requiredId(c) {
  const id = parsePositiveId(c.req.param('id'))
  return id
}

function isChina(c) {
  return (c.env?.CF_IP_COUNTRY || '') === 'CN'
}

export async function searchAnime(c) {
  try {
    const keyword = c.req.query('keyword')
    if (!keyword) return c.json({ error: '请输入搜索关键词' }, 400)
    const typeNum = Number(c.req.query('type')) || 0
    const opts = {
      page: Number(c.req.query('page')) || 1,
      limit: Number(c.req.query('limit') || '20'),
      isChina: isChina(c)
    }
    if (typeNum > 0) opts.type = typeNum
    const result = await bangumiService.searchAnime(keyword, opts)
    return c.json({ data: result.data, total: result.total })
  } catch {
    return c.json({ error: '搜索失败' }, 500)
  }
}

export async function browseAnime(c) {
  try {
    const q = c.req.query()
    const params = { isChina: isChina(c) }
    if (q.sort) params.sort = q.sort
    if (q.type && Number(q.type) > 0) params.type = q.type
    if (q.page) params.page = q.page
    if (q.limit) params.limit = q.limit
    if (q.tag) params.tag = q.tag
    const result = await bangumiService.browseAnime(params)
    return c.json({ data: result.data, total: result.total })
  } catch {
    return c.json({ error: '浏览失败' }, 500)
  }
}

export async function getAnimeDetail(c) {
  const id = requiredId(c)
  if (id === null) return c.json({ error: 'ID 不合法' }, 400)
  try {
    const detail = await bangumiService.getAnimeDetail(id, { isChina: isChina(c) })
    return c.json({ data: detail })
  } catch {
    return c.json({ error: '获取详情失败' }, 500)
  }
}

export async function getAnimeEpisodes(c) {
  const id = requiredId(c)
  const offset = parseBoundedInteger(c.req.query('offset'), { min: 0, max: 1000000, fallback: 0 })
  const limit = parseBoundedInteger(c.req.query('limit'), { min: 1, max: 100, fallback: 100 })
  if (id === null || offset === null || limit === null) return c.json({ error: '参数不合法' }, 400)
  try {
    const data = await bangumiService.getAnimeEpisodes(id, { offset, limit, isChina: isChina(c) })
    return c.json({ data: data.data, total: data.total })
  } catch {
    return c.json({ error: '获取章节失败' }, 500)
  }
}

export async function getAnimeCharacters(c) {
  const id = requiredId(c)
  if (id === null) return c.json({ error: 'ID 不合法' }, 400)
  try {
    const data = await bangumiService.getAnimeCharacters(id, { isChina: isChina(c) })
    return c.json({ data })
  } catch {
    return c.json({ error: '获取角色失败' }, 500)
  }
}

export async function getAnimePersons(c) {
  const id = requiredId(c)
  if (id === null) return c.json({ error: 'ID 不合法' }, 400)
  try {
    const data = await bangumiService.getAnimePersons(id, { isChina: isChina(c) })
    return c.json({ data })
  } catch {
    return c.json({ error: '获取制作人员失败' }, 500)
  }
}

export async function getAnimeRelations(c) {
  const id = requiredId(c)
  if (id === null) return c.json({ error: 'ID 不合法' }, 400)
  try {
    const data = await bangumiService.getAnimeRelations(id, { isChina: isChina(c) })
    return c.json({ data })
  } catch {
    return c.json({ error: '获取关联条目失败' }, 500)
  }
}

export async function getAnimeCalendar(c) {
  try {
    const data = await bangumiService.getAnimeCalendar({ isChina: isChina(c) })
    return c.json({ data })
  } catch {
    return c.json({ error: '获取时间表失败' }, 500)
  }
}

export async function getAnimeTags(c) {
  try {
    const data = await bangumiService.getAnimeTags()
    return c.json({ data })
  } catch {
    return c.json({ error: '获取标签失败' }, 500)
  }
}

export async function getCharacterDetail(c) {
  const id = requiredId(c)
  if (id === null) return c.json({ error: 'ID 不合法' }, 400)
  try {
    const data = await bangumiService.getCharacterDetail(id, { isChina: isChina(c) })
    return c.json({ data })
  } catch {
    return c.json({ error: '获取角色详情失败' }, 500)
  }
}

export async function getCharacterSubjects(c) {
  const id = requiredId(c)
  if (id === null) return c.json({ error: 'ID 不合法' }, 400)
  try {
    const data = await bangumiService.getCharacterSubjects(id, {
      isChina: isChina(c)
    })
    return c.json({ data })
  } catch {
    return c.json({ error: '获取角色作品失败' }, 500)
  }
}

export async function getCharacterPersons(c) {
  const id = requiredId(c)
  if (id === null) return c.json({ error: 'ID 不合法' }, 400)
  try {
    const data = await bangumiService.getCharacterPersons(id, {
      isChina: isChina(c)
    })
    return c.json({ data })
  } catch {
    return c.json({ error: '获取角色关联人物失败' }, 500)
  }
}

export async function getPersonDetail(c) {
  const id = requiredId(c)
  if (id === null) return c.json({ error: 'ID 不合法' }, 400)
  try {
    const data = await bangumiService.getPersonDetail(id, { isChina: isChina(c) })
    return c.json({ data })
  } catch {
    return c.json({ error: '获取人物详情失败' }, 500)
  }
}

export async function getPersonSubjects(c) {
  const id = requiredId(c)
  if (id === null) return c.json({ error: 'ID 不合法' }, 400)
  try {
    const data = await bangumiService.getPersonSubjects(id, { isChina: isChina(c) })
    return c.json({ data })
  } catch {
    return c.json({ error: '获取人物作品失败' }, 500)
  }
}
