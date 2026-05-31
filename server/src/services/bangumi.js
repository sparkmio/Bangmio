import axios from 'axios'

const BANGUMI_API = 'https://api.bgm.tv'
const client = axios.create({ baseURL: BANGUMI_API, timeout: 15000 })

client.interceptors.request.use(config => {
  config.headers['User-Agent'] = 'Bangmio/anime-manager'
  return config
})

export function getClient(token) {
  if (!token) return client
  return axios.create({
    baseURL: BANGUMI_API,
    timeout: 15000,
    headers: {
      'User-Agent': 'Bangmio/anime-manager',
      'Authorization': `Bearer ${token}`
    }
  })
}

function buildSearchBody(keyword, params = {}) {
  const validSorts = ['match', 'heat', 'rank', 'score']
  const sort = validSorts.includes(params.sort) ? params.sort : 'rank'
  const filter = {}

  if (params.type) {
    filter.type = Array.isArray(params.type) ? params.type.map(Number) : [Number(params.type)]
  }

  if (params.tag) {
    filter.tag = Array.isArray(params.tag) ? params.tag : params.tag.split(',')
  }

  const body = { keyword: keyword || '', sort, filter }

  const queryParams = {
    limit: Number(params.limit) || 20,
    offset: ((Number(params.page) || 1) - 1) * (Number(params.limit) || 20)
  }

  return { body, queryParams }
}

export async function searchAnime(keyword, opts = {}) {
  const { body, queryParams } = buildSearchBody(keyword, opts)
  const response = await client.post('/v0/search/subjects', body, { params: queryParams })
  const d = response.data
  return { data: d.data || [], total: d.total || 0 }
}

export async function browseAnime(params = {}) {
  const { body, queryParams } = buildSearchBody('', params)
  const response = await client.post('/v0/search/subjects', body, { params: queryParams })
  const d = response.data
  return { data: d.data || [], total: d.total || 0 }
}

export async function getAnimeDetail(id) {
  const response = await client.get(`/v0/subjects/${id}`)
  return response.data
}

export async function getAnimeEpisodes(id, { offset = 0, limit = 100 } = {}) {
  const response = await client.get('/v0/episodes', {
    params: { subject_id: id, offset, limit }
  })
  const d = response.data
  return { data: d.data || [], total: d.total || 0 }
}

export async function getAnimeCharacters(id) {
  const response = await client.get(`/v0/subjects/${id}/characters`)
  return response.data
}

export async function getAnimeRelations(id) {
  const response = await client.get(`/v0/subjects/${id}/subjects`)
  return response.data
}

export async function getAnimePersons(id) {
  const response = await client.get(`/v0/subjects/${id}/persons`)
  return response.data
}

export async function getAnimeCalendar() {
  const response = await client.get('/calendar')
  return response.data
}

export async function getAnimeTags() {
  return [
    { name: '恋爱' }, { name: '搞笑' }, { name: '战斗' }, { name: '奇幻' },
    { name: '校园' }, { name: '科幻' }, { name: '日常' }, { name: '冒险' },
    { name: '悬疑' }, { name: '热血' }, { name: '治愈' }, { name: '推理' },
    { name: '美食' }, { name: '运动' }, { name: '音乐' }, { name: '百合' },
    { name: '耽美' }, { name: '异世界' }, { name: '机甲' }, { name: '穿越' }
  ]
}

export async function getCharacterSubjects(id) {
  const response = await client.get(`/v0/characters/${id}/subjects`)
  return response.data
}

export async function getCharacterPersons(id) {
  const response = await client.get(`/v0/characters/${id}/persons`)
  return response.data
}

export async function getPersonDetail(id) {
  const response = await client.get(`/v0/persons/${id}`)
  return response.data
}

export async function getPersonSubjects(id) {
  const response = await client.get(`/v0/persons/${id}/subjects`)
  return response.data
}
