const DOUBAN_API = 'https://movie.douban.com'
const MOBILE_API = 'https://m.douban.com/rexxar/api/v2'
const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'

function collapseSpace(s) {
  return (s || '').replace(/\s+/g, ' ').trim()
}

/**
 * 带超时的 fetch。豆瓣上游偶发连接挂起；必须给每次请求明确预算，
 * 以便页面能稳定降级而不是无限等待。
 * @param {string} url
 * @param {Record<string, string>} headers
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, headers = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    return await fetch(url, { headers, signal: controller.signal, redirect: 'follow' })
  } finally {
    clearTimeout(timer)
  }
}

/** 豆瓣移动端公开 JSON 端点的公共请求头。 */
const MOBILE_HEADERS = {
  'User-Agent': MOBILE_UA,
  Referer: 'https://m.douban.com/',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9'
}

/**
 * 调用豆瓣移动端 rexxar 接口并保证非 JSON/异常响应不会泄漏到路由层。
 * 豆瓣会将 movie/{id} 自动跳转到 tv/{id}；fetch 的 redirect: follow
 * 使电影与动画都可用同一个入口。
 */
async function fetchMobileJson(path) {
  try {
    const separator = path.includes('?') ? '&' : '?'
    const res = await fetchWithTimeout(
      `${MOBILE_API}/${path}${separator}for_mobile=1`,
      MOBILE_HEADERS
    )
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('json')) return null
    return await res.json()
  } catch {
    return null
  }
}

function getRating(data) {
  const value = Number(data?.rating?.value)
  return Number.isFinite(value) ? value.toFixed(1).replace(/\.0$/, '') : '0'
}

function getStar(data) {
  const starCount = Number(data?.rating?.star_count)
  // 旧组件的 star 字段是 10 分制；移动端 star_count 是 5 分制。
  return Number.isFinite(starCount) ? starCount * 2 : 0
}

/**
 * 将移动端搜索响应转换为本站统一候选格式。
 * 只保留电影/电视剧（动画在豆瓣通常归 tv），排除同名图书和小组内容。
 */
function parseMobileSearch(json) {
  const items = json?.subjects?.items || []
  return items
    .filter(item => ['movie', 'tv'].includes(item?.target_type) && item?.target?.id)
    .map(item => {
      const target = item.target
      return {
        id: String(target.id),
        title: target.title || '',
        year: target.year || '',
        rate: getRating(target),
        star: getStar(target),
        cover: target.cover_url || '',
        type: item.target_type
      }
    })
}

/**
 * 在豆瓣搜索条目（番剧→豆瓣关联匹配）。
 * 桌面 suggest 和网页抓取会频繁进入 sec.douban.com 验证；移动端搜索实际返回
 * 结构化结果，因此将其作为唯一主路径。失败时返回空数组，路由可正常降级。
 */
export async function searchDouban(name) {
  if (!name) return []
  const data = await fetchMobileJson(`search?q=${encodeURIComponent(name)}&start=0&count=10`)
  return parseMobileSearch(data)
}

/**
 * 获取豆瓣条目的结构化详情（移动端 movie/tv 接口）。
 * @param {string|number} subjectId - 豆瓣条目 ID。
 * @returns {Promise<Object|null>} 与旧 subject_abstract 兼容的字段集合。
 */
export async function getDoubanAbstract(subjectId) {
  if (!subjectId) return null
  const data = await fetchMobileJson(`movie/${encodeURIComponent(subjectId)}`)
  if (!data?.id) return null

  return {
    id: String(data.id),
    title: data.title || '',
    rate: getRating(data),
    star: getStar(data),
    episodes_count: Number(data.episodes_count) || 0,
    release_year: data.year || '',
    types: Array.isArray(data.genres) ? data.genres : [],
    region: Array.isArray(data.countries) ? data.countries.join(' / ') : '',
    directors: (data.directors || []).map(person => person?.name).filter(Boolean),
    actors: (data.actors || []).map(person => person?.name).filter(Boolean),
    duration: Array.isArray(data.durations) ? data.durations.join(' / ') : '',
    intro: collapseSpace(data.intro || ''),
    short_comment: null,
    url: `${DOUBAN_API}/subject/${data.id}/`
  }
}

/**
 * 获取豆瓣短评（移动端 interests JSON）。不再抓会触发风控的桌面 comments HTML。
 * @param {string|number} subjectId - 豆瓣条目 ID。
 */
export async function getDoubanComments(subjectId) {
  if (!subjectId) return []
  const data = await fetchMobileJson(
    `movie/${encodeURIComponent(subjectId)}/interests?start=0&count=30&order=hot&status=done`
  )
  if (!Array.isArray(data?.interests)) return []

  return data.interests
    .map(item => ({
      user: item?.user?.name || '匿名用户',
      rating: Math.round(Number(item?.rating?.star_count) || 0) * 10,
      time: item?.create_time || '',
      content: String(item?.comment || '').trim(),
      useful: Number(item?.vote_count) || 0
    }))
    .filter(item => item.content)
}

/**
 * 获取豆瓣长评（移动端 reviews JSON）。abstract 是接口提供的可展示正文，不做人为 500 字截断。
 * @param {string|number} subjectId - 豆瓣条目 ID。
 */
export async function getDoubanReviews(subjectId) {
  if (!subjectId) return []
  const data = await fetchMobileJson(
    `movie/${encodeURIComponent(subjectId)}/reviews?start=0&count=15`
  )
  if (!Array.isArray(data?.reviews)) return []

  return data.reviews
    .map(item => ({
      user: item?.user?.name || '匿名用户',
      rating: Math.round(Number(item?.rating?.star_count) || 0) * 10,
      time: item?.create_time || '',
      title: item?.title || '',
      content: String(item?.abstract || '').trim(),
      useful: Number(item?.useful_count) || 0,
      url: item?.url || ''
    }))
    .filter(item => item.content)
}

/**
 * 获取豆瓣条目的结构化摘要。移动端详情接口已提供简介、导演、演员和类型，
 * 所以不再以桌面 subject 页 HTML 作为必要依赖。
 */
export async function getDoubanSummary(id) {
  const abstract = await getDoubanAbstract(id)
  const url = `${DOUBAN_API}/subject/${id}/`
  if (!abstract) {
    return { title: '', rate: '0', star: 0, url, intro: '', keyInfo: {} }
  }

  const keyInfo = {}
  if (abstract.directors?.length) keyInfo['导演'] = abstract.directors.join(' / ')
  if (abstract.actors?.length) keyInfo['主演'] = abstract.actors.join(' / ')
  if (abstract.types?.length) keyInfo['类型'] = abstract.types.join(' / ')
  if (abstract.region) keyInfo['制片国家/地区'] = abstract.region
  if (abstract.release_year) keyInfo['首播'] = abstract.release_year
  if (abstract.duration) keyInfo['单集片长'] = abstract.duration

  return {
    title: abstract.title,
    rate: abstract.rate,
    star: abstract.star,
    url: abstract.url || url,
    intro: abstract.intro,
    keyInfo
  }
}
