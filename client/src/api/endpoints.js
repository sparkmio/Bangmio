import api, { backend, isProdWeb, getOAuthConfig } from './index'

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
    // 生产 web：走后端，回调 = OAUTH_REDIRECT_URI（bangmio.pages.dev），secret 留服务端
    if (isProdWeb()) {
      return backend.get('/user/oauth-url').then(res => ({ data: { data: res.data.data } }))
    }
    // 本地（dev / Electron）：本地 app + localhost 回调
    const cfg = getOAuthConfig()
    const url = `https://bgm.tv/oauth/authorize?client_id=${cfg.clientId}&response_type=code&redirect_uri=${encodeURIComponent(cfg.redirectUri)}`
    return Promise.resolve({ data: { data: url } })
  },
  async oauthCallback(code) {
    if (isProdWeb()) {
      const res = await backend.post('/user/oauth-callback', { code })
      return { data: { data: res.data.data } }
    }
    const cfg = getOAuthConfig()
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      code,
      redirect_uri: cfg.redirectUri
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

// 吐槽箱 / 讨论版：全部走后端 /api/v1/comments/*，服务端抓取 HTML + China 镜像感知，绕开浏览器 CORS
export const commentsAPI = {
  getCharacterComments(id) {
    return backend.get(`/comments/character/${id}`).then(res => ({ data: { data: res.data.data } }))
  },
  getSubjectComments(id) {
    return backend.get(`/comments/subject/${id}`).then(res => ({ data: { data: res.data.data } }))
  },
  getSubjectTopics(id) {
    return backend.get(`/comments/subject/${id}/topics`).then(res => ({ data: { data: res.data.data } }))
  },
  getTopicDetail(topicId) {
    return backend.get(`/comments/topic/${topicId}`).then(res => ({ data: { data: res.data.data } }))
  },
  getPersonComments(id) {
    return backend.get(`/comments/person/${id}`).then(res => ({ data: { data: res.data.data } }))
  },
  postComment(subjectId, body) {
    return backend.post(`/comments/subject/${subjectId}/comment`, body)
      .then(res => ({ data: { success: res.data.success } }))
  },
  postReply(topicId, body) {
    return backend.post(`/comments/topic/${topicId}/reply`, body)
      .then(res => ({ data: { success: res.data.success } }))
  },
  postTalkbox(subjectId, body) {
    return backend.post(`/comments/subject/${subjectId}/talkbox`, body)
      .then(res => ({ data: { success: res.data.success } }))
  },
  postTopic(subjectId, body) {
    return backend.post(`/comments/subject/${subjectId}/topic`, body)
      .then(res => ({ data: { success: res.data.success } }))
  }
}

// 豆瓣评分：走后端 /api/v1/douban/*，服务端抓取，绕开豆瓣 CORS
export const doubanAPI = {
  getRating(id) {
    return backend.get(`/douban/${id}`).then(res => ({ data: { data: res.data.data } }))
  },
  // 直接用番名搜豆瓣，不依赖 Bangumi API（避免镜像/被墙影响）
  getDetails(id, name) {
    if (name) {
      return backend.get('/douban/by-name', { params: { name } }).then(res => ({ data: { data: res.data.data } }))
    }
    return backend.get(`/douban/${id}/details`).then(res => ({ data: { data: res.data.data } }))
  }
}

// 萌娘百科：走后端 /api/v1/moegirl/search，服务端 China 镜像感知
export const moegirlAPI = {
  search(q) {
    return backend.get('/moegirl/search', { params: { q } }).then(res => ({ data: { data: res.data.data } }))
  }
}
