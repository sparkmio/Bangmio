import * as bangumiService from '../services/bangumi.js'

export async function searchAnime(c) {
  try {
    const keyword = c.req.query('keyword')
    if (!keyword) return c.json({ error: '请输入搜索关键词' }, 400)
    const typeNum = Number(c.req.query('type')) || 0
    const opts = { page: Number(c.req.query('page')) || 1, limit: Number(c.req.query('limit')) || 20 }
    if (typeNum > 0) opts.type = typeNum
    const result = await bangumiService.searchAnime(keyword, opts)
    return c.json({ data: result.data, total: result.total })
  } catch { return c.json({ error: '搜索失败' }, 500) }
}

export async function browseAnime(c) {
  try {
    const q = c.req.query()
    const params = {}
    if (q.sort) params.sort = q.sort
    if (q.type && Number(q.type) > 0) params.type = q.type
    if (q.page) params.page = q.page
    if (q.limit) params.limit = q.limit
    if (q.tag) params.tag = q.tag
    const result = await bangumiService.browseAnime(params)
    return c.json({ data: result.data, total: result.total })
  } catch { return c.json({ error: '浏览失败' }, 500) }
}

export async function getAnimeDetail(c) {
  try {
    const detail = await bangumiService.getAnimeDetail(c.req.param('id'))
    return c.json({ data: detail })
  } catch { return c.json({ error: '获取详情失败' }, 500) }
}

export async function getAnimeEpisodes(c) {
  try {
    const data = await bangumiService.getAnimeEpisodes(c.req.param('id'), c.req.query())
    return c.json({ data: data.data, total: data.total })
  } catch { return c.json({ error: '获取章节失败' }, 500) }
}

export async function getAnimeCharacters(c) {
  try {
    const data = await bangumiService.getAnimeCharacters(c.req.param('id'))
    return c.json({ data })
  } catch { return c.json({ error: '获取角色失败' }, 500) }
}

export async function getAnimePersons(c) {
  try {
    const data = await bangumiService.getAnimePersons(c.req.param('id'))
    return c.json({ data })
  } catch { return c.json({ error: '获取制作人员失败' }, 500) }
}

export async function getAnimeRelations(c) {
  try {
    const data = await bangumiService.getAnimeRelations(c.req.param('id'))
    return c.json({ data })
  } catch { return c.json({ error: '获取关联条目失败' }, 500) }
}

export async function getAnimeCalendar(c) {
  try {
    const data = await bangumiService.getAnimeCalendar()
    return c.json({ data })
  } catch { return c.json({ error: '获取时间表失败' }, 500) }
}

export async function getAnimeTags(c) {
  try {
    const data = await bangumiService.getAnimeTags()
    return c.json({ data })
  } catch { return c.json({ error: '获取标签失败' }, 500) }
}

export async function getCharacterDetail(c) {
  try {
    const data = await bangumiService.getCharacterDetail(c.req.param('id'))
    return c.json({ data })
  } catch { return c.json({ error: '获取角色详情失败' }, 500) }
}

export async function getCharacterSubjects(c) {
  try {
    const data = await bangumiService.getCharacterSubjects(c.req.param('id'))
    return c.json({ data })
  } catch { return c.json({ error: '获取角色作品失败' }, 500) }
}

export async function getCharacterPersons(c) {
  try {
    const data = await bangumiService.getCharacterPersons(c.req.param('id'))
    return c.json({ data })
  } catch { return c.json({ error: '获取角色关联人物失败' }, 500) }
}

export async function getPersonDetail(c) {
  try {
    const data = await bangumiService.getPersonDetail(c.req.param('id'))
    return c.json({ data })
  } catch { return c.json({ error: '获取人物详情失败' }, 500) }
}

export async function getPersonSubjects(c) {
  try {
    const data = await bangumiService.getPersonSubjects(c.req.param('id'))
    return c.json({ data })
  } catch { return c.json({ error: '获取人物作品失败' }, 500) }
}
