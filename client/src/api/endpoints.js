import api from './index'
import * as scrape from '../utils/scrape'

const BGM_TAGS = [
  { name: '恋爱' }, { name: '搞笑' }, { name: '战斗' }, { name: '奇幻' },
  { name: '校园' }, { name: '科幻' }, { name: '日常' }, { name: '冒险' },
  { name: '悬疑' }, { name: '热血' }, { name: '治愈' }, { name: '推理' },
  { name: '美食' }, { name: '运动' }, { name: '音乐' }, { name: '百合' },
  { name: '耽美' }, { name: '异世界' }, { name: '机甲' }, { name: '穿越' }
]

function buildSearchBody(keyword, params = {}) {
  const validSorts = ['match', 'heat', 'rank', 'score']
  const sort = validSorts.includes(params.sort) ? params.sort : 'rank'
  const filter = {}
  if (params.type) {
    const t = Number(params.type)
    if (t > 0) filter.type = Array.isArray(params.type) ? params.type.map(Number) : [t]
  }
  if (params.tag) filter.tag = Array.isArray(params.tag) ? params.tag : params.tag.split(',')
  const body = { keyword: keyword || '', sort, filter }
  const limit = Number(params.limit) || 20
  const page = Number(params.page) || 1
  return { body, limit, offset: (page - 1) * limit }
}

export const userAPI = {
  auth(token) {
    return api.get('/v0/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => ({ data: { user: res.data, token } }))
  },
  getMe() {
    return api.get('/v0/me').then(res => ({ data: { data: res.data } }))
  },
  getOAuthUrl() {
    const redirectUri = window.location.origin + '/login/callback'
    const url = `https://bgm.tv/oauth/authorize?client_id=bgm61416a088eff71580&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}`
    return Promise.resolve({ data: { data: url } })
  },
  async oauthCallback(code) {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: 'bgm61416a088eff71580',
      client_secret: '6b8055c0159fcc5e998059536813026f',
      code,
      redirect_uri: window.location.origin + '/login/callback'
    })
    const tokenRes = await fetch('https://bgm.tv/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    })
    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token
    const refreshToken = tokenData.refresh_token
    if (!accessToken) throw new Error('获取 Token 失败')
    const userRes = await api.get('/v0/me', { headers: { Authorization: `Bearer ${accessToken}` } })
    return { data: { data: { user: userRes.data, token: accessToken, refreshToken: refreshToken || '' } } }
  },
  getUser(username) {
    return api.get(`/v0/users/${username}`).then(res => ({ data: { data: res.data } }))
  }
}

export const animeAPI = {
  search(params) {
    const { body, limit, offset } = buildSearchBody(params.keyword, params)
    return api.post(`/v0/search/subjects?limit=${limit}&offset=${offset}`, body)
      .then(res => ({ data: { data: res.data.data || [], total: res.data.total || 0 } }))
  },
  browse(params) {
    const { body, limit, offset } = buildSearchBody('', params)
    return api.post(`/v0/search/subjects?limit=${limit}&offset=${offset}`, body)
      .then(res => ({ data: { data: res.data.data || [], total: res.data.total || 0 } }))
  },
  getDetail(id) {
    return api.get(`/v0/subjects/${id}`).then(res => ({ data: { data: res.data } }))
  },
  getEpisodes(id, params = {}) {
    const offset = params.offset || 0
    const limit = params.limit || 100
    return api.get(`/v0/episodes?subject_id=${id}&offset=${offset}&limit=${limit}`)
      .then(res => ({ data: { data: res.data.data || [], total: res.data.total || 0 } }))
  },
  getCharacters(id) {
    return api.get(`/v0/subjects/${id}/characters`).then(res => ({ data: { data: res.data } }))
  },
  getPersons(id) {
    return api.get(`/v0/subjects/${id}/persons`).then(res => ({ data: { data: res.data } }))
  },
  getRelations(id) {
    return api.get(`/v0/subjects/${id}/subjects`).then(res => ({ data: { data: res.data } }))
  },
  getCalendar() {
    return api.get('/calendar').then(res => ({ data: { data: res.data } }))
  },
  getTags() {
    return Promise.resolve({ data: { data: BGM_TAGS } })
  },
  getCharacterDetail(id) {
    return api.get(`/v0/characters/${id}`).then(res => ({ data: { data: res.data } }))
  },
  getCharacterSubjects(id) {
    return api.get(`/v0/characters/${id}/subjects`).then(res => ({ data: { data: res.data } }))
  },
  getCharacterPersons(id) {
    return api.get(`/v0/characters/${id}/persons`).then(res => ({ data: { data: res.data } }))
  },
  getPersonDetail(id) {
    return api.get(`/v0/persons/${id}`).then(res => ({ data: { data: res.data } }))
  },
  getPersonSubjects(id) {
    return api.get(`/v0/persons/${id}/subjects`).then(res => ({ data: { data: res.data } }))
  }
}

export const collectionAPI = {
  getList(params = {}) {
    const user = JSON.parse(localStorage.getItem('bangmio_user') || '{}')
    const username = params.username || user.username || '-'
    let url = `/v0/users/${username}/collections?`
    if (params.subject_type) url += `subject_type=${params.subject_type}&`
    if (params.type) url += `type=${params.type}&`
    if (params.offset) url += `offset=${params.offset}&`
    if (params.limit) url += `limit=${params.limit}&`
    return api.get(url).then(res => ({ data: { data: res.data.data || [], total: res.data.total || 0 } }))
  },
  async getOne(animeId) {
    const user = JSON.parse(localStorage.getItem('bangmio_user') || '{}')
    if (!user.username) return { data: { data: null } }
    const res = await api.get(`/v0/users/${user.username}/collections?limit=1000`)
    const col = (res.data.data || []).find(c => c.subject_id === Number(animeId) || c.subject?.id === Number(animeId))
    if (!col) return { data: { data: null } }
    return { data: { data: {
      anime_id: col.subject_id,
      status: col.type,
      rating: col.rate || 0,
      comment: col.comment || '',
      episode: col.ep_status || 0,
      subject: col.subject || null,
      updated_at: col.updated_at
    }}}
  },
  async save(animeId, body) {
    const payload = {}
    if (body.status) payload.type = body.status
    if (body.rating) payload.rate = body.rating
    if (body.comment !== undefined) payload.comment = body.comment
    if (body.tags) payload.tags = body.tags
    const res = await api.post(`/v0/users/-/collections/${animeId}`, payload)
    return { data: { data: res.data } }
  },
  remove(animeId) {
    return api.delete(`/v0/users/-/collections/${animeId}`).then(res => ({ data: { data: res.data } }))
  },
  async getStats() {
    const user = JSON.parse(localStorage.getItem('bangmio_user') || '{}')
    if (!user.username) return { data: { data: {} } }
    const res = await api.get(`/v0/users/${user.username}/collections?limit=1000`)
    const items = res.data.data || []
    const stats = { want: 0, watching: 0, completed: 0, on_hold: 0, dropped: 0, total: items.length }
    items.forEach(c => {
      if (c.type === 1) stats.want++
      else if (c.type === 2) stats.completed++
      else if (c.type === 3) stats.watching++
      else if (c.type === 4) stats.on_hold++
      else if (c.type === 5) stats.dropped++
    })
    return { data: { data: stats } }
  }
}

const scrapeCache = new Map()
const SCRAPE_TTL = 5 * 60 * 1000

function getCachedScrape(key) {
  const c = scrapeCache.get(key)
  if (c && Date.now() - c.time < SCRAPE_TTL) return c.data
  return null
}
function setCachedScrape(key, data) {
  scrapeCache.set(key, { data, time: Date.now() })
}

export const commentsAPI = {
  async getCharacterComments(id) {
    const cacheKey = `char_${id}`
    const cached = getCachedScrape(cacheKey)
    if (cached) return { data: { data: cached } }
    const html = await scrape.fetchHTML(`/character/${id}`)
    const data = scrape.parseTalkbox(html)
    setCachedScrape(cacheKey, data)
    return { data: { data } }
  },
  async getSubjectComments(id) {
    const cacheKey = `subj_${id}`
    const cached = getCachedScrape(cacheKey)
    if (cached) return { data: { data: cached } }
    const html = await scrape.fetchHTML(`/subject/${id}`)
    const data = scrape.parseSubjectTalkbox(html)
    setCachedScrape(cacheKey, data)
    return { data: { data } }
  },
  async getSubjectTopics(id) {
    const cacheKey = `topics_${id}`
    const cached = getCachedScrape(cacheKey)
    if (cached) return { data: { data: cached } }
    const html = await scrape.fetchHTML(`/subject/${id}/board`)
    const data = scrape.parseTopics(html)
    setCachedScrape(cacheKey, data)
    return { data: { data } }
  },
  async getTopicDetail(topicId) {
    const cacheKey = `topic_${topicId}`
    const cached = getCachedScrape(cacheKey)
    if (cached) return { data: { data: cached } }
    const html = await scrape.fetchHTML(`/subject/topic/${topicId}`)
    const data = scrape.parseTopicPage(html)
    setCachedScrape(cacheKey, data)
    return { data: { data } }
  },
  async getPersonComments(id) {
    const cacheKey = `person_${id}`
    const cached = getCachedScrape(cacheKey)
    if (cached) return { data: { data: cached } }
    const html = await scrape.fetchHTML(`/person/${id}`)
    const data = scrape.parseTalkbox(html)
    setCachedScrape(cacheKey, data)
    return { data: { data } }
  },
  async postComment(subjectId, body) {
    const token = localStorage.getItem('bangmio_token')
    if (!token) throw new Error('未登录')
    const ok = await scrape.postComment(subjectId, body.content, token)
    return { data: { success: ok } }
  },
  async postReply(topicId, body) {
    const token = localStorage.getItem('bangmio_token')
    if (!token) throw new Error('未登录')
    const ok = await scrape.postReply(topicId, body.content, token)
    return { data: { success: ok } }
  },
  async postTalkbox(subjectId, body) {
    const token = localStorage.getItem('bangmio_token')
    if (!token) throw new Error('未登录')
    const ok = await scrape.postTalkbox(subjectId, body.content, token)
    return { data: { success: ok } }
  },
  async postTopic(subjectId, body) {
    const token = localStorage.getItem('bangmio_token')
    if (!token) throw new Error('未登录')
    const ok = await scrape.postTopic(subjectId, body.title, body.content, token)
    return { data: { success: ok } }
  }
}

export const doubanAPI = {
  async getRating(id) {
    try {
      const detail = await animeAPI.getDetail(id)
      const name = detail.data?.data?.name_cn || detail.data?.data?.name
      if (!name) return { data: { data: null } }
      const suggestUrl = `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(name)}`
      const suggestRes = await fetch(suggestUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': 'https://movie.douban.com/' }
      })
      const suggestions = await suggestRes.json()
      const match = suggestions?.find(s => s.title === name) || suggestions?.[0]
      if (!match) return { data: { data: null } }
      const abstractUrl = `https://movie.douban.com/j/subject_abstract?subject_id=${match.id}`
      const abstractRes = await fetch(abstractUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': `https://movie.douban.com/subject/${match.id}/` }
      })
      const abstractData = await abstractRes.json()
      const abstract = abstractData?.subject || abstractData
      return { data: { data: {
        id: match.id,
        title: abstract?.title || match.title,
        rate: abstract?.rate || '0',
        star: abstract?.star || 0,
        episodes_count: abstract?.episodes_count || 0,
        release_year: abstract?.release_year || '',
        types: abstract?.types || [],
        short_comment: abstract?.short_comment || null,
        url: `https://movie.douban.com/subject/${match.id}`
      }}}
    } catch { return { data: { data: null } } }
  },
  async getDetails(id) {
    return this.getRating(id)
  }
}

export const moegirlAPI = {
  async search(q) {
    const mirror = localStorage.getItem('bangmio_mirror') || 'intl'
    const base = mirror === 'cn' ? 'https://zh.moegirl.org.cn' : 'https://zh.moegirl.uk'
    const url = `${base}/api.php?action=query&titles=${encodeURIComponent(q)}&prop=extracts&format=json`
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Bangmio/1.0', 'Accept': 'application/json' } })
      const json = await res.json()
      if (!json?.query?.pages) return { data: { data: { results: [], page: null } } }
      const pages = Object.values(json.query.pages)
      const page = pages[0]
      if (!page?.extract) return { data: { data: { results: [], page: null } } }
      return { data: { data: {
        results: [{ title: page.title, description: '', url: `${base}/${encodeURIComponent(page.title)}` }],
        page: { title: page.title, html: page.extract, url: `${base}/${encodeURIComponent(page.title)}` }
      }}}
    } catch { return { data: { data: { results: [], page: null } } } }
  }
}
