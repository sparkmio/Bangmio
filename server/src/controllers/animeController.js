import * as bangumiService from '../services/bangumi.js'

export async function searchAnime(req, res) {
  try {
    const { keyword, type, page, limit } = req.query
    if (!keyword) return res.status(400).json({ error: '请输入搜索关键词' })
    const typeNum = type ? Number(type) : 0
    const opts = { page: Number(page) || 1, limit: Number(limit) || 20 }
    if (typeNum > 0) opts.type = typeNum
    const result = await bangumiService.searchAnime(keyword, opts)
    res.json({ data: result.data, total: result.total })
  } catch (err) {
    res.status(500).json({ error: '搜索失败' })
  }
}

export async function browseAnime(req, res) {
  try {
    const result = await bangumiService.browseAnime(req.query)
    res.json({ data: result.data, total: result.total })
  } catch (err) {
    res.status(500).json({ error: '浏览失败' })
  }
}

export async function getAnimeDetail(req, res) {
  try {
    const detail = await bangumiService.getAnimeDetail(req.params.id)
    res.json({ data: detail })
  } catch (err) {
    res.status(500).json({ error: '获取详情失败' })
  }
}

export async function getAnimeEpisodes(req, res) {
  try {
    const data = await bangumiService.getAnimeEpisodes(req.params.id, req.query)
    res.json({ data: data.data, total: data.total })
  } catch (err) {
    res.status(500).json({ error: '获取章节失败' })
  }
}

export async function getAnimeCharacters(req, res) {
  try {
    const data = await bangumiService.getAnimeCharacters(req.params.id)
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: '获取角色失败' })
  }
}

export async function getAnimePersons(req, res) {
  try {
    const data = await bangumiService.getAnimePersons(req.params.id)
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: '获取制作人员失败' })
  }
}

export async function getAnimeRelations(req, res) {
  try {
    const data = await bangumiService.getAnimeRelations(req.params.id)
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: '获取关联条目失败' })
  }
}

export async function getAnimeCalendar(req, res) {
  try {
    const data = await bangumiService.getAnimeCalendar()
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: '获取时间表失败' })
  }
}

export async function getAnimeTags(req, res) {
  try {
    const data = await bangumiService.getAnimeTags()
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: '获取标签失败' })
  }
}

export async function getCharacterDetail(req, res) {
  try {
    const axios = (await import('axios')).default
    const { data } = await axios.get(`https://api.bgm.tv/v0/characters/${req.params.id}`, {
      headers: { 'User-Agent': 'Bangmio/anime-manager' },
      timeout: 15000
    })
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: '获取角色详情失败' })
  }
}

export async function getCharacterSubjects(req, res) {
  try {
    const data = await bangumiService.getCharacterSubjects(req.params.id)
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: '获取角色作品失败' })
  }
}

export async function getCharacterPersons(req, res) {
  try {
    const data = await bangumiService.getCharacterPersons(req.params.id)
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: '获取角色关联人物失败' })
  }
}

export async function getPersonDetail(req, res) {
  try {
    const data = await bangumiService.getPersonDetail(req.params.id)
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: '获取人物详情失败' })
  }
}

export async function getPersonSubjects(req, res) {
  try {
    const data = await bangumiService.getPersonSubjects(req.params.id)
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: '获取人物作品失败' })
  }
}
