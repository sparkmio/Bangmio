const BGM_API = 'https://api.bgm.tv'
const BGM_PROXY = 'https://api.bangumi.pro'

function rewriteImageUrls(data) {
  if (typeof data === 'string') return data.replace(/lain\.bgm\.tv/g, 'lain.bangumi.pro')
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
    ? { 'User-Agent': 'Bangmio/anime-manager', Authorization: `Bearer ${token}` }
    : { 'User-Agent': 'Bangmio/anime-manager' }
}

function apiBases(isChina) {
  return isChina ? [BGM_PROXY, BGM_API] : [BGM_API, BGM_PROXY]
}

function apiError(status, data, cause) {
  const err = new Error(`Bangumi API ${status}`)
  err.response = { status, data }
  if (cause) err.cause = cause
  return err
}

/**
 * 统一请求 Bangumi API。优先按地区选择的源；网络异常、5xx 或无效 JSON 时自动
 * 回退另一个 API 域名。401/403 直接返回，避免把真实的 Token 问题伪装成网络问题。
 */
async function bgmRequest(method, path, { token, body, params, isChina = false } = {}) {
  let lastError

  for (const base of apiBases(isChina)) {
    const url = new URL(`${base}${path}`)
    if (params)
      Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, String(v)))
    try {
      const requestHeaders =
        method === 'POST'
          ? { ...headers(token), 'Content-Type': 'application/json' }
          : headers(token)
      const res = await fetch(url.toString(), {
        ...(method === 'GET' ? {} : { method }),
        headers: requestHeaders,
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      })
      const text = await res.text()
      let data = {}
      try {
        data = text ? JSON.parse(text) : {}
      } catch (cause) {
        lastError = apiError(res.status, { error: 'Invalid JSON response' }, cause)
        continue
      }
      if (res.ok) return rewriteImageUrls(data)

      const error = apiError(res.status, data)
      if (res.status === 401 || res.status === 403 || res.status < 500) throw error
      lastError = error
    } catch (error) {
      if (
        error?.response?.status === 401 ||
        error?.response?.status === 403 ||
        error?.response?.status < 500
      ) {
        throw error
      }
      lastError = error
    }
  }

  throw lastError || new Error('Bangumi API unavailable')
}

async function bgmGet(path, token, params, isChina = false) {
  return bgmRequest('GET', path, { token, params, isChina })
}

async function bgmPost(path, body, token, params, isChina = false) {
  return bgmRequest('POST', path, { token, body, params, isChina })
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

/**
 * 判断请求来源是否为中国大陆（基于 Cloudflare 的 CF_IP_COUNTRY 头）。
 * 用于决定是否使用国内代理 BGM_PROXY。
 * @param {{ env?: { CF_IP_COUNTRY?: string } }} c - Hono 上下文，需包含 env.CF_IP_COUNTRY。
 * @returns {boolean} 是否来自中国大陆。
 */
export function getIsChina(c) {
  return (c.env?.CF_IP_COUNTRY || '') === 'CN'
}

/**
 * 搜索番剧条目（基于 Bangumi `/v0/search/subjects` 接口）。
 * @param {string} keyword - 搜索关键词。
 * @param {Object} [opts] - 搜索选项。
 * @param {number} [opts.limit=20] - 每页返回数量。
 * @param {number} [opts.page=1] - 页码（从 1 开始）。
 * @param {('match'|'heat'|'rank'|'score')} [opts.sort='rank'] - 排序方式。
 * @param {number|number[]} [opts.type] - 条目类型过滤。
 * @param {string|string[]} [opts.tag] - 标签过滤（多个用逗号分隔或传数组）。
 * @param {boolean} [opts.isChina] - 是否使用国内代理。
 * @returns {Promise<{ data: Array<Object>, total: number }>} 搜索结果列表及总数。
 */
export async function searchAnime(keyword, opts = {}) {
  const { body, limit, offset } = buildSearchBody(keyword, opts)
  const d = await bgmPost('/v0/search/subjects', body, null, { limit, offset }, opts.isChina)
  return { data: d.data || [], total: d.total || 0 }
}

/**
 * 浏览/筛选番剧条目（不带关键词，仅按类型/标签过滤）。
 * @param {Object} [params] - 过滤参数，字段同 searchAnime 的 opts。
 * @param {number} [params.limit=20] - 每页返回数量。
 * @param {number} [params.page=1] - 页码。
 * @param {('match'|'heat'|'rank'|'score')} [params.sort='rank'] - 排序方式。
 * @param {number|number[]} [params.type] - 条目类型过滤。
 * @param {string|string[]} [params.tag] - 标签过滤。
 * @param {boolean} [params.isChina] - 是否使用国内代理。
 * @returns {Promise<{ data: Array<Object>, total: number }>} 浏览结果列表及总数。
 */
export async function browseAnime(params = {}) {
  const { body, limit, offset } = buildSearchBody('', params)
  const d = await bgmPost('/v0/search/subjects', body, null, { limit, offset }, params.isChina)
  return { data: d.data || [], total: d.total || 0 }
}

/**
 * 创建一个携带 token 的 Bangumi API 客户端（用于需要鉴权的用户接口）。
 * @param {string} token - Bangumi 用户 Access Token。
 * @param {boolean} [isChina=false] - 是否使用国内代理。
 * @returns {{
 *   get: (path: string, params?: Object) => Promise<Object>,
 *   post: (path: string, body?: Object, params?: Object) => Promise<Object>,
 *   delete: (path: string) => Promise<Object>
 * }} 客户端对象，包含 get/post/delete 三个方法。
 */
export function getClient(token, isChina = false) {
  return {
    get: (path, params) => bgmGet(path, token, params, isChina),
    post: (path, body, params) => bgmPost(path, body, token, params, isChina),
    delete: path => bgmRequest('DELETE', path, { token, isChina })
  }
}

/**
 * 获取番剧条目详情。
 * @param {number|string} id - 条目 ID。
 * @param {Object} [opts] - 选项。
 * @param {boolean} [opts.isChina] - 是否使用国内代理。
 * @returns {Promise<Object>} 条目详情对象。
 */
export async function getAnimeDetail(id, opts) {
  return bgmGet(`/v0/subjects/${id}`, null, null, opts?.isChina)
}

/**
 * 获取番剧条目的剧集列表（分页）。
 * @param {number|string} id - 条目 ID。
 * @param {Object} [opts] - 分页与代理选项。
 * @param {number} [opts.offset=0] - 偏移量。
 * @param {number} [opts.limit=100] - 每页数量。
 * @param {boolean} [opts.isChina] - 是否使用国内代理。
 * @returns {Promise<{ data: Array<Object>, total: number }>} 剧集列表及总数。
 */
export async function getAnimeEpisodes(id, { offset = 0, limit = 100, isChina } = {}) {
  const d = await bgmGet('/v0/episodes', null, { subject_id: id, offset, limit }, isChina)
  return { data: d.data || [], total: d.total || 0 }
}

/**
 * 获取番剧条目的角色列表。
 * @param {number|string} id - 条目 ID。
 * @param {Object} [opts] - 选项。
 * @param {boolean} [opts.isChina] - 是否使用国内代理。
 * @returns {Promise<Array<Object>>} 角色列表。
 */
export async function getAnimeCharacters(id, opts) {
  return bgmGet(`/v0/subjects/${id}/characters`, null, null, opts?.isChina)
}

/**
 * 获取番剧条目的关联条目列表。
 * @param {number|string} id - 条目 ID。
 * @param {Object} [opts] - 选项。
 * @param {boolean} [opts.isChina] - 是否使用国内代理。
 * @returns {Promise<Array<Object>>} 关联条目列表。
 */
export async function getAnimeRelations(id, opts) {
  return bgmGet(`/v0/subjects/${id}/subjects`, null, null, opts?.isChina)
}

/**
 * 获取番剧条目的制作人员（Staff）列表。
 * @param {number|string} id - 条目 ID。
 * @param {Object} [opts] - 选项。
 * @param {boolean} [opts.isChina] - 是否使用国内代理。
 * @returns {Promise<Array<Object>>} 制作人员列表。
 */
export async function getAnimePersons(id, opts) {
  return bgmGet(`/v0/subjects/${id}/persons`, null, null, opts?.isChina)
}

/**
 * 获取每日放送日历。
 * @param {Object} [opts] - 选项。
 * @param {boolean} [opts.isChina] - 是否使用国内代理。
 * @returns {Promise<Array<Object>>} 日历列表。
 */
export async function getAnimeCalendar(opts) {
  return bgmGet('/calendar', null, null, opts?.isChina)
}

/**
 * 获取预设的番剧标签列表（本地静态数据，不发请求）。
 * @returns {Promise<Array<{ name: string }>>} 标签对象数组。
 */
export async function getAnimeTags() {
  return [
    { name: '恋爱' },
    { name: '搞笑' },
    { name: '战斗' },
    { name: '奇幻' },
    { name: '校园' },
    { name: '科幻' },
    { name: '日常' },
    { name: '冒险' },
    { name: '悬疑' },
    { name: '热血' },
    { name: '治愈' },
    { name: '推理' },
    { name: '美食' },
    { name: '运动' },
    { name: '音乐' },
    { name: '百合' },
    { name: '耽美' },
    { name: '异世界' },
    { name: '机甲' },
    { name: '穿越' }
  ]
}

/**
 * 获取角色详情。
 * @param {number|string} id - 角色 ID。
 * @param {Object} [opts] - 选项。
 * @param {boolean} [opts.isChina] - 是否使用国内代理。
 * @returns {Promise<Object>} 角色详情对象。
 */
export async function getCharacterDetail(id, opts) {
  return bgmGet(`/v0/characters/${id}`, null, null, opts?.isChina)
}

/**
 * 获取角色参演的条目列表。
 * @param {number|string} id - 角色 ID。
 * @param {Object} [opts] - 选项。
 * @param {boolean} [opts.isChina] - 是否使用国内代理。
 * @returns {Promise<Array<Object>>} 角色参演条目列表。
 */
export async function getCharacterSubjects(id, opts) {
  return bgmGet(`/v0/characters/${id}/subjects`, null, null, opts?.isChina)
}

/**
 * 获取角色的出演人员（CV）列表。
 * @param {number|string} id - 角色 ID。
 * @param {Object} [opts] - 选项。
 * @param {boolean} [opts.isChina] - 是否使用国内代理。
 * @returns {Promise<Array<Object>>} 出演人员列表。
 */
export async function getCharacterPersons(id, opts) {
  return bgmGet(`/v0/characters/${id}/persons`, null, null, opts?.isChina)
}

/**
 * 获取制作人员（现实人物）详情。
 * @param {number|string} id - 人物 ID。
 * @param {Object} [opts] - 选项。
 * @param {boolean} [opts.isChina] - 是否使用国内代理。
 * @returns {Promise<Object>} 人物详情对象。
 */
export async function getPersonDetail(id, opts) {
  return bgmGet(`/v0/persons/${id}`, null, null, opts?.isChina)
}

/**
 * 获取制作人员参与的条目列表。
 * @param {number|string} id - 人物 ID。
 * @param {Object} [opts] - 选项。
 * @param {boolean} [opts.isChina] - 是否使用国内代理。
 * @returns {Promise<Array<Object>>} 人物参与条目列表。
 */
export async function getPersonSubjects(id, opts) {
  return bgmGet(`/v0/persons/${id}/subjects`, null, null, opts?.isChina)
}
