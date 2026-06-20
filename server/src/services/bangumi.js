const BGM_API = 'https://api.bgm.tv'
const BGM_PROXY = 'https://api.bangumi.one'

function rewriteImageUrls(data) {
  if (typeof data === 'string') return data.replace(/lain\.bgm\.tv/g, 'lain.bangumi.one')
  if (Array.isArray(data)) return data.map(rewriteImageUrls)
  if (data && typeof data === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(data)) out[k] = rewriteImageUrls(v)
    return out
  }
  return data
}

function headers(token) {
  return token
    ? { 'User-Agent': 'Bangmio/anime-manager', 'Authorization': `Bearer ${token}` }
    : { 'User-Agent': 'Bangmio/anime-manager' }
}

async function bgmGet(path, token, params, isChina = false) {
  const base = isChina ? BGM_PROXY : BGM_API
  const url = new URL(`${base}${path}`)
  if (params) Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v))
  const res = await fetch(url.toString(), { headers: headers(token) })
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) {
    const err = new Error(`Bangumi API ${res.status}`)
    err.response = { status: res.status, data }
    throw err
  }
  return rewriteImageUrls(data)
}

async function bgmPost(path, body, token, params, isChina = false) {
  const base = isChina ? BGM_PROXY : BGM_API
  const url = new URL(`${base}${path}`)
  if (params) Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) {
    const err = new Error(`Bangumi API ${res.status}`)
    err.response = { status: res.status, data }
    throw err
  }
  return rewriteImageUrls(data)
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

export function getIsChina(c) {
  return (c.env?.CF_IP_COUNTRY || '') === 'CN'
}

export async function searchAnime(keyword, opts = {}) {
  const { body, limit, offset } = buildSearchBody(keyword, opts)
  const d = await bgmPost('/v0/search/subjects', body, null, { limit, offset }, opts.isChina)
  return { data: d.data || [], total: d.total || 0 }
}

export async function browseAnime(params = {}) {
  const { body, limit, offset } = buildSearchBody('', params)
  const d = await bgmPost('/v0/search/subjects', body, null, { limit, offset }, params.isChina)
  return { data: d.data || [], total: d.total || 0 }
}

export function getClient(token, isChina = false) {
  return {
    get: (path, params) => bgmGet(path, token, params, isChina),
    post: (path, body, params) => bgmPost(path, body, token, params, isChina),
    delete: async (path) => {
      const base = isChina ? BGM_PROXY : BGM_API
      const r = await fetch(`${base}${path}`, { method: 'DELETE', headers: headers(token) })
      const t = await r.text()
      return t ? JSON.parse(t) : {}
    }
  }
}

export async function getAnimeDetail(id, opts) { return bgmGet(`/v0/subjects/${id}`, null, null, opts?.isChina) }
export async function getAnimeEpisodes(id, { offset = 0, limit = 100, isChina } = {}) {
  const d = await bgmGet('/v0/episodes', null, { subject_id: id, offset, limit }, isChina)
  return { data: d.data || [], total: d.total || 0 }
}
export async function getAnimeCharacters(id, opts) { return bgmGet(`/v0/subjects/${id}/characters`, null, null, opts?.isChina) }
export async function getAnimeRelations(id, opts) { return bgmGet(`/v0/subjects/${id}/subjects`, null, null, opts?.isChina) }
export async function getAnimePersons(id, opts) { return bgmGet(`/v0/subjects/${id}/persons`, null, null, opts?.isChina) }
export async function getAnimeCalendar(opts) { return bgmGet('/calendar', null, null, opts?.isChina) }
export async function getAnimeTags() {
  return [
    { name: '恋爱' }, { name: '搞笑' }, { name: '战斗' }, { name: '奇幻' },
    { name: '校园' }, { name: '科幻' }, { name: '日常' }, { name: '冒险' },
    { name: '悬疑' }, { name: '热血' }, { name: '治愈' }, { name: '推理' },
    { name: '美食' }, { name: '运动' }, { name: '音乐' }, { name: '百合' },
    { name: '耽美' }, { name: '异世界' }, { name: '机甲' }, { name: '穿越' }
  ]
}
export async function getCharacterDetail(id, opts) {
  return bgmGet(`/v0/characters/${id}`, null, null, opts?.isChina)
}
export async function getCharacterSubjects(id, opts) { return bgmGet(`/v0/characters/${id}/subjects`, null, null, opts?.isChina) }
export async function getCharacterPersons(id, opts) { return bgmGet(`/v0/characters/${id}/persons`, null, null, opts?.isChina) }
export async function getPersonDetail(id, opts) { return bgmGet(`/v0/persons/${id}`, null, null, opts?.isChina) }
export async function getPersonSubjects(id, opts) { return bgmGet(`/v0/persons/${id}/subjects`, null, null, opts?.isChina) }
