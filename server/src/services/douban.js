import { parseHTML } from 'linkedom'
import { fetchHTML } from '../utils/http.js'

const DOUBAN_API = 'https://movie.douban.com'
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

function stripTags(s) {
  return (s || '').replace(/<[^>]+>/g, '').trim()
}

function collapseSpace(s) {
  return (s || '').replace(/\s+/g, ' ').trim()
}

/**
 * 在豆瓣搜索条目（基于豆瓣 suggest 接口，常用于番剧→豆瓣关联匹配）。
 * @param {string} name - 搜索关键词（番剧名等）。
 * @returns {Promise<Array<Object>>} 豆瓣 suggest 返回的候选条目数组，可能为空。
 */
export async function searchDouban(name) {
  const url = `${DOUBAN_API}/j/subject_suggest?q=${encodeURIComponent(name)}`
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Referer: 'https://movie.douban.com/' }
  })
  const data = await res.json()
  return data || []
}

/**
 * 获取豆瓣条目的摘要信息（基于豆瓣 subject_abstract JSON 接口）。
 * @param {string|number} subjectId - 豆瓣条目 ID。
 * @returns {Promise<Object|null>} 条目摘要对象；接口未返回 subject 时回退为整个 data，仍无则返回 null。
 */
export async function getDoubanAbstract(subjectId) {
  const url = `${DOUBAN_API}/j/subject_abstract?subject_id=${subjectId}`
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Referer: `https://movie.douban.com/subject/${subjectId}/` }
  })
  const data = await res.json()
  return data?.subject || data || null
}

/**
 * 抓取豆瓣条目的短评（HTML 抓取，分 2 页共约 40 条）。
 * 单页失败会被跳过，不影响其他页结果。
 * @param {string|number} subjectId - 豆瓣条目 ID。
 * @returns {Promise<Array<{ user: string, rating: number, time: string, content: string, useful: number }>>}
 *   短评对象数组，字段：user（用户名）、rating（评分 0/10/20/30/40/50）、time（日期）、content（内容）、useful（有用数）。
 */
export async function getDoubanComments(subjectId) {
  const allComments = []
  // 抓 2 页，共 40 条短评
  const starts = [0, 20]

  for (const start of starts) {
    try {
      const url = `${DOUBAN_API}/subject/${subjectId}/comments?start=${start}&limit=20&status=P`
      const res = await fetch(url, {
        headers: {
          'User-Agent': UA,
          Referer: `${DOUBAN_API}/subject/${subjectId}/`,
          Accept: 'text/html',
          'Accept-Language': 'zh-CN,zh;q=0.9'
        }
      })
      if (!res.ok) continue
      const html = await res.text()

      // 按 comment-item 分割逐条解析
      const parts = html.split(/(?=<div class="comment-item)/i)
      for (const part of parts) {
        if (!/comment-item/i.test(part)) continue

        // 用户名
        const userMatch = part.match(/<a[^>]*href="[^"]*\/people\/[^"]+"[^>]*>([^<]+)<\/a>/i)
        const user = userMatch ? userMatch[1].trim() : '匿名'

        // 评分：allstar50 -> 50, allstar40 -> 40 等
        const ratingMatch = part.match(/allstar(\d{2})/i) || part.match(/rating["\s]*([\d-]+)/i)
        let rating = 0
        if (ratingMatch) rating = parseInt(ratingMatch[1]) || 0

        // 日期
        const timeMatch = part.match(/<span class="comment-time[^"]*"[^>]*>([^<]+)<\/span>/i)
        const time = timeMatch ? timeMatch[1].trim() : ''

        // 内容
        const contentMatch = part.match(/<p class="[^"]*"[^>]*>([\s\S]*?)<\/p>/i)
        let content = contentMatch
          ? contentMatch[1]
              .replace(/<br\s*\/?>/gi, '\n')
              .replace(/<[^>]+>/g, '')
              .trim()
          : ''

        // 有用数
        const usefulMatch =
          part.match(/<span class="votes vote-count">(\d+)<\/span>/i) ||
          part.match(/<span class="vote-count"[^>]*>(\d+)<\/span>/i) ||
          part.match(/class="[^"]*vote-count[^"]*"[^>]*>(\d+)/i)
        const useful = usefulMatch ? parseInt(usefulMatch[1]) : 0

        if (content) {
          allComments.push({ user, rating, time, content, useful })
        }
        if (allComments.length >= 40) break
      }
    } catch {
      // 跳过该页错误，继续下一页
    }
    if (allComments.length >= 40) break
  }

  return allComments
}

/**
 * 抓取豆瓣条目的长评（HTML 抓取，最多 20 条）。
 * 内容超过 500 字会被截断并以 '...' 结尾。
 * @param {string|number} subjectId - 豆瓣条目 ID。
 * @returns {Promise<Array<{ user: string, rating: number, time: string, title: string, content: string, useful: number }>>}
 *   长评对象数组，字段：user、rating、time、title（标题）、content（内容，最多约 500 字）、useful。
 */
export async function getDoubanReviews(subjectId) {
  const url = `${DOUBAN_API}/subject/${subjectId}/reviews`
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Referer: `${DOUBAN_API}/subject/${subjectId}/`,
      Accept: 'text/html',
      'Accept-Language': 'zh-CN,zh;q=0.9'
    }
  })
  if (!res.ok) return []
  const html = await res.text()

  const reviews = []
  // 按 review-item 分割逐条解析
  const parts = html.split(/(?=<div class="review-item)/i)

  for (const part of parts.slice(0, 25)) {
    if (!/review-item/i.test(part)) continue

    // 用户名
    const userMatch = part.match(/<a[^>]*href="[^"]*\/people\/[^"]+"[^>]*>([^<]+)<\/a>/i)
    const user = userMatch ? userMatch[1].trim() : '匿名'

    // 评分：allstar50 -> 50, allstar40 -> 40, allstar30 -> 30, allstar20 -> 20, allstar10 -> 10
    const ratingMatch = part.match(/allstar(\d{2})/i)
    const rating = ratingMatch ? parseInt(ratingMatch[1]) : 0

    // 时间
    const timeMatch = part.match(/<span class="date"[^>]*>([^<]+)<\/span>/i)
    const time = timeMatch ? timeMatch[1].trim() : ''

    // 标题
    const titleMatch = part.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)
    const title = titleMatch ? stripTags(titleMatch[1]) : ''

    // 内容：截断 500 字
    const contentMatch = part.match(/<div class="review-content"[^>]*>([\s\S]*?)<\/div>/i)
    let content = contentMatch
      ? contentMatch[1]
          .replace(/<a[^>]*>\(展开\)<\/a>/gi, '')
          .replace(/<a[^>]*>展开<\/a>/gi, '')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .trim()
      : ''
    if (content.length > 500) content = content.slice(0, 500) + '...'

    // 有用数
    const usefulMatch =
      part.match(/<span class="num"[^>]*>(\d+)<\/span>/i) ||
      part.match(/class="[^"]*action-btn[^"]*up[^"]*"[^>]*>[\s\S]*?(\d+)/i) ||
      part.match(/class="[^"]*vote-count[^"]*"[^>]*>(\d+)/i)
    const useful = usefulMatch ? parseInt(usefulMatch[1]) : 0

    reviews.push({ user, rating, time, title, content, useful })
    if (reviews.length >= 20) break
  }

  return reviews
}

/**
 * 解析豆瓣条目页 #info 区块，提取导演、编剧、类型、首播等键值对。
 * @param {Document} document - linkedom 解析后的 document。
 * @returns {Record<string, string>}
 */
function parseDoubanInfo(document) {
  const infoEl = document.querySelector('#info')
  if (!infoEl) return {}

  const result = {}
  const pls = Array.from(infoEl.querySelectorAll('.pl'))
  pls.forEach((pl, i) => {
    const key = collapseSpace(pl.textContent).replace(/[:：\s]/g, '')
    const nextPl = pls[i + 1]
    let value = ''
    let node = pl.nextSibling
    while (node && node !== nextPl) {
      if (node.nodeType === 1 && node.classList?.contains('pl')) break
      value += node.textContent || ''
      node = node.nextSibling
    }
    value = collapseSpace(value).replace(/^[:：]\s*/, '')
    if (key && value) result[key] = value
  })

  return result
}

/**
 * 获取豆瓣条目的结构化摘要。
 * 优先复用 getDoubanAbstract 的 title/rate/star，再从条目页 HTML 中抽取 intro 与 keyInfo。
 * 任一环节失败时返回已获取的可用字段，不抛错误。
 *
 * @param {string|number} id - 豆瓣条目 ID。
 * @returns {Promise<{ title: string, rate: string, star: number, url: string, intro: string, keyInfo: Record<string, string> }>}
 */
export async function getDoubanSummary(id) {
  const url = `${DOUBAN_API}/subject/${id}/`
  let abstract = null
  try {
    abstract = await getDoubanAbstract(id)
  } catch {
    abstract = null
  }

  const result = {
    title: abstract?.title || '',
    rate: abstract?.rate || '0',
    star: abstract?.star || 0,
    url,
    intro: '',
    keyInfo: {}
  }

  try {
    const html = await fetchHTML(url, {
      headers: {
        'User-Agent': UA,
        Referer: `${DOUBAN_API}/`,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      }
    })
    if (!html || html.length < 500) return result

    const { document } = parseHTML(html)

    // 简介：优先展开版 .all，其次 #link-report，最后 property="v:summary"
    const introEl =
      document.querySelector('#link-report .all') ||
      document.querySelector('#link-report') ||
      document.querySelector('[property="v:summary"]')
    if (introEl) {
      result.intro = collapseSpace(stripTags(introEl.innerHTML))
    }

    result.keyInfo = parseDoubanInfo(document)

    // 若 abstract 未拿到 title，尝试从页面 title/h1 补充
    if (!result.title) {
      const titleEl = document.querySelector('h1 span') || document.querySelector('title')
      if (titleEl) {
        result.title = collapseSpace(stripTags(titleEl.innerHTML)).replace(
          /\s*\(\s*豆瓣\s*\)$/i,
          ''
        )
      }
    }
  } catch {
    // 静默忽略，返回已有字段
  }

  return result
}
