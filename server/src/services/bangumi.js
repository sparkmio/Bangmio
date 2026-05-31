const BANGUMI_API = 'https://api.bgm.tv'

function headers(token) {
  return token
    ? { 'User-Agent': 'Bangmio/anime-manager', 'Authorization': `Bearer ${token}` }
    : { 'User-Agent': 'Bangmio/anime-manager' }
}

async function bgmGet(path, token, params) {
  const url = new URL(`${BANGUMI_API}${path}`)
  if (params) Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v))
  const res = await fetch(url.toString(), { headers: headers(token) })
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(`Bangumi API ${res.status}`)
    err.response = { status: res.status, data }
    throw err
  }
  return data
}

async function bgmPost(path, body, token, params) {
  const url = new URL(`${BANGUMI_API}${path}`)
  if (params) Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(`Bangumi API ${res.status}`)
    err.response = { status: res.status, data }
    throw err
  }
  return data
}

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

export async function searchAnime(keyword, opts = {}) {
  const { body, limit, offset } = buildSearchBody(keyword, opts)
  const d = await bgmPost('/v0/search/subjects', body, null, { limit, offset })
  return { data: d.data || [], total: d.total || 0 }
}

export async function browseAnime(params = {}) {
  const { body, limit, offset } = buildSearchBody('', params)
  const d = await bgmPost('/v0/search/subjects', body, null, { limit, offset })
  return { data: d.data || [], total: d.total || 0 }
}

export function getClient(token) {
  return {
    get: (path, params) => bgmGet(path, token, params),
    post: (path, body, params) => bgmPost(path, body, token, params),
    delete: (path) => fetch(`${BANGUMI_API}${path}`, { method: 'DELETE', headers: headers(token) }).then(r => r.json())
  }
}

export async function getAnimeDetail(id) { return bgmGet(`/v0/subjects/${id}`) }
export async function getAnimeEpisodes(id, { offset = 0, limit = 100 } = {}) {
  const d = await bgmGet('/v0/episodes', null, { subject_id: id, offset, limit })
  return { data: d.data || [], total: d.total || 0 }
}
export async function getAnimeCharacters(id) { return bgmGet(`/v0/subjects/${id}/characters`) }
export async function getAnimeRelations(id) { return bgmGet(`/v0/subjects/${id}/subjects`) }
export async function getAnimePersons(id) { return bgmGet(`/v0/subjects/${id}/persons`) }
export async function getAnimeCalendar() { return bgmGet('/calendar') }
export async function getAnimeTags() {
  return [
    { name: '恋爱' }, { name: '搞笑' }, { name: '战斗' }, { name: '奇幻' },
    { name: '校园' }, { name: '科幻' }, { name: '日常' }, { name: '冒险' },
    { name: '悬疑' }, { name: '热血' }, { name: '治愈' }, { name: '推理' },
    { name: '美食' }, { name: '运动' }, { name: '音乐' }, { name: '百合' },
    { name: '耽美' }, { name: '异世界' }, { name: '机甲' }, { name: '穿越' }
  ]
}
export async function getCharacterDetail(id) {
  return bgmGet(`/v0/characters/${id}`)
}
export async function getCharacterSubjects(id) { return bgmGet(`/v0/characters/${id}/subjects`) }
export async function getCharacterPersons(id) { return bgmGet(`/v0/characters/${id}/persons`) }
export async function getPersonDetail(id) { return bgmGet(`/v0/persons/${id}`) }
export async function getPersonSubjects(id) { return bgmGet(`/v0/persons/${id}/subjects`) }
