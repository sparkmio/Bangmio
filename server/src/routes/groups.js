import { Hono } from 'hono'
import { parseHTML } from 'linkedom'
import { createCache } from '../utils/cache.js'
import { fetchHTMLMulti, parseNumber, fixUrl } from '../utils/http.js'
import { CACHE_TTL_GROUPS } from '../config.js'

const app = new Hono()

const HOSTS = {
  main: 'https://bgm.tv',
  mirror1: 'https://bangumi.lol',
  mirror2: 'https://bangumi.one'
}

const cache = createCache(CACHE_TTL_GROUPS)

// 永不过期的「最近一次成功」缓存，仅在抓取失败时回退使用
const lastSuccessStore = new Map()

function getBaseUrls(isChina) {
  // 国内节点优先走代理镜像，海外节点优先走官方
  if (isChina) {
    return [HOSTS.mirror1, HOSTS.mirror2, HOSTS.main]
  }
  return [HOSTS.main, HOSTS.mirror1, HOSTS.mirror2]
}

// 8 个高活跃真实小组兜底
const FALLBACK_GROUPS = [
  {
    id: 'bgm38',
    name: 'Bangumi 新番组',
    description: '新番讨论、资讯与推荐',
    member_count: 3800,
    avatar: ''
  },
  {
    id: 'acg',
    name: 'ACG 综合讨论',
    description: '动画、漫画、游戏综合交流',
    member_count: 5600,
    avatar: ''
  },
  { id: 'a', name: '动画', description: '动画讨论小组', member_count: 4200, avatar: '' },
  { id: 'c', name: '漫画', description: '漫画讨论小组', member_count: 3100, avatar: '' },
  { id: 'g', name: '游戏', description: '游戏讨论小组', member_count: 2800, avatar: '' },
  { id: 'n', name: '音乐', description: '音乐讨论小组', member_count: 1900, avatar: '' },
  {
    id: 'touhou',
    name: '东方 Project',
    description: '东方 Project 讨论小组',
    member_count: 1700,
    avatar: ''
  },
  { id: 'tech', name: '技术', description: '技术交流小组', member_count: 1800, avatar: '' }
]

/**
 * 从锚点 href 中提取小组 id。
 * 兼容相对路径（/group/xxx）、绝对路径（https://bgm.tv/group/xxx）与带查询串的链接。
 * @param {string} href
 * @returns {string | null}
 */
function groupIdFromHref(href) {
  const m = String(href || '').match(/(?:^|[/])group\/([^/?#]+)/)
  if (!m) return null
  try {
    return decodeURIComponent(m[1])
  } catch {
    return m[1]
  }
}

/**
 * 折叠空白并去除首尾空格（等价于原 unescapeHtml 的空白折叠，DOM textContent 已解码实体）。
 * @param {string} str
 * @returns {string}
 */
function collapseText(str) {
  return (str || '').replace(/\s+/g, ' ').trim()
}

function parseGroupListHTML(html, base) {
  const groups = []
  const seen = new Set()

  const { document } = parseHTML(html)

  for (const anchor of document.querySelectorAll('a[href]')) {
    const id = collapseText(groupIdFromHref(anchor.getAttribute('href')))
    if (!id) continue

    // 过滤非小组链接
    if (/\.(jpg|png|gif|jpeg|webp)$/i.test(id)) continue
    if (/^\d+$/.test(id)) continue
    if (id === 'new_topic' || id.startsWith('topic')) continue
    if (id === 'discover' || id === 'all' || id === 'category') continue

    // 名称：锚点的纯文本（img 的 alt 等不参与）
    const name = collapseText(anchor.textContent)
    if (!name || /^\d+$/.test(name)) continue

    // 成员数：在锚点所在容器（通常是 li/行）内查找 "NNN 位成员"；
    // 孤儿节点回退到锚点后的兄弟元素文本
    let member_count = 0
    let containerText = anchor.parentElement?.textContent || ''
    if (!containerText) {
      let sib = anchor.nextElementSibling
      while (sib && containerText.length < 200) {
        containerText += ' ' + (sib.textContent || '')
        sib = sib.nextElementSibling
      }
    }
    const memberMatch = containerText.match(/([0-9][0-9,]*)\s*(?:位成员|成员|members?)/i)
    if (memberMatch) {
      member_count = parseNumber(memberMatch[1])
    }

    // 头像：锚点内 img 优先，其次容器内 img
    let avatar = ''
    const img = anchor.querySelector('img[src]') || anchor.parentElement?.querySelector('img[src]')
    if (img) {
      avatar = fixUrl(img.getAttribute('src'), base)
    }

    if (!seen.has(id)) {
      seen.add(id)
      groups.push({
        id,
        name,
        description: '',
        member_count,
        avatar,
        url: `${base}/group/${id}`
      })
    }

    if (groups.length >= 60) break
  }

  return groups
}

/**
 * 查找 class 名包含指定子串的第一个元素。
 * @param {Document} document
 * @param {string} substr
 * @returns {Element | null}
 */
function firstByClassSubstring(document, substr) {
  for (const el of document.querySelectorAll('[class]')) {
    if ((el.getAttribute('class') || '').includes(substr)) return el
  }
  return null
}

function parseGroupDetailHTML(html, id, base) {
  const { document } = parseHTML(html)

  // 名称：第一个 h1 的纯文本，缺失时回退为 id
  const h1 = document.querySelector('h1')
  const name = h1 ? collapseText(h1.textContent) : ''
  const finalName = name || id

  // 简介：class 含 group_desc / text / intro 的 div，或 class 含 tip 的 p（保持原顺序）
  let description = ''
  for (const pattern of ['group_desc', 'text', 'intro', 'tip']) {
    const el = firstByClassSubstring(document, pattern)
    const text = el ? collapseText(el.textContent) : ''
    if (text) {
      description = el.textContent.trim()
      break
    }
  }

  // 成员数：1) 全文 "NNN 位成员"；2) class 含 group_member/member/sub 的元素；
  //         3) <strong>NNN</strong> 后跟成员关键字
  let member_count = 0
  const bodyText = document.body?.textContent || ''
  const memberMatch = bodyText.match(/([0-9,]+)\s*(?:位成员|成员|members?)/i)
  if (memberMatch) {
    member_count = parseNumber(memberMatch[1])
  } else {
    const memberEl =
      firstByClassSubstring(document, 'group_member') ||
      firstByClassSubstring(document, 'member') ||
      firstByClassSubstring(document, 'sub')
    if (memberEl) {
      member_count = parseNumber(memberEl.textContent)
    }
  }
  if (!member_count) {
    for (const strong of document.querySelectorAll('strong')) {
      const strongText = collapseText(strong.textContent)
      if (!/^\d[\d,]*$/.test(strongText)) continue
      const parentText = strong.parentElement?.textContent || ''
      if (/(?:位成员|成员|members?)/i.test(parentText)) {
        member_count = parseNumber(strongText)
        break
      }
    }
  }

  // 头像：h1 附近（向上最多 4 层容器内）第一个 img
  let avatar = ''
  let node = h1?.parentElement || null
  for (let i = 0; i < 4 && node; i++) {
    const img = node.querySelector('img[src]')
    if (img) {
      avatar = fixUrl(img.getAttribute('src'), base)
      break
    }
    node = node.parentElement
  }

  // 话题：仅在 .topic_list 表格内解析（无该表格时回退到含 /group/topic/ 链接的表格）
  const topics = []
  const seenTopics = new Set()
  let table = null
  for (const t of document.querySelectorAll('table')) {
    if ((t.getAttribute('class') || '').includes('topic_list')) {
      table = t
      break
    }
  }
  if (!table) {
    for (const t of document.querySelectorAll('table')) {
      if (t.querySelector('a[href*="/group/topic/"]')) {
        table = t
        break
      }
    }
  }
  if (table) {
    for (const anchor of table.querySelectorAll('a[href]')) {
      const topicMatch = (anchor.getAttribute('href') || '').match(/\/group\/topic\/(\d+)/)
      if (!topicMatch) continue
      const topicId = topicMatch[1]
      if (seenTopics.has(topicId)) continue
      seenTopics.add(topicId)

      const title = collapseText(anchor.textContent)
      if (!title) continue

      const row = anchor.closest('tr') || anchor.parentElement
      const rowText = row?.textContent || ''

      // 作者：行内 /user/ 链接
      let author = ''
      const userLink = row?.querySelector('a[href*="/user/"]')
      if (userLink) {
        author = collapseText(userLink.textContent)
      }

      // 回复数：td.posts / class 含 posts 的元素，回退 "(N 回复)" / "N 回复"
      let reply_count = 0
      const postsEl = row?.querySelector('td.posts, [class*="posts"]')
      if (postsEl) {
        reply_count = parseNumber(postsEl.textContent)
      }
      if (!reply_count) {
        const replyMatch =
          rowText.match(/\((\d+)\s*(?:回复|reply|条)/i) || rowText.match(/(\d+)\s*(?:回复|reply)/i)
        if (replyMatch) reply_count = parseNumber(replyMatch[1])
      }

      // 最后回复时间：small.time / span.date / span.time / small，排除成员数类文本
      let last_reply_time = ''
      const timeEl = row?.querySelector('small.time, span.date, span.time, small')
      if (timeEl) {
        const timeText = collapseText(timeEl.textContent)
        if (!/^\d+\s*(?:位成员|成员|members?)$/.test(timeText)) {
          last_reply_time = timeText
        }
      }

      topics.push({ id: topicId, title, author, reply_count, last_reply_time })
      if (topics.length >= 20) break
    }
  }

  return {
    id,
    name: finalName,
    description,
    member_count,
    avatar,
    topics,
    url: `${base}/group/${id}`
  }
}

// 导出解析函数供单元测试使用（fixture 驱动，不依赖上游网络）
export { parseGroupListHTML, parseGroupDetailHTML }

// GET /groups - 小组列表
app.get('/', async c => {
  try {
    const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
    const cacheKey = `groups_list_${isChina ? 'cn' : 'global'}`
    const cached = cache.get(cacheKey)
    if (cached) return c.json({ data: cached.data, degraded: cached.degraded === true })

    const bases = getBaseUrls(isChina)
    const urls = bases.map(base => `${base}/group/all`)

    let groups = []
    let baseUrl = bases[0]
    let degraded = false
    try {
      const { html, url } = await fetchHTMLMulti(urls)
      baseUrl = url.replace(/\/group\/all\/?$/, '') || bases[0]
      try {
        groups = parseGroupListHTML(html, baseUrl)
      } catch {
        // 解析异常立即使用兜底数据
        groups = []
      }
    } catch {
      groups = []
    }

    if (groups.length < 10) {
      const fallback = FALLBACK_GROUPS.map(g => ({ ...g, url: `${baseUrl}/group/${g.id}` }))
      // 合并真实解析结果和兜底，避免重复
      const seen = new Set(groups.map(g => g.id))
      for (const g of fallback) {
        if (!seen.has(g.id)) {
          seen.add(g.id)
          groups.push(g)
        }
      }
      degraded = true
    }

    cache.set(cacheKey, { data: groups, degraded })
    return c.json({ data: groups, degraded })
  } catch {
    return c.json({
      data: FALLBACK_GROUPS.map(g => ({ ...g, url: `${HOSTS.main}/group/${g.id}` })),
      degraded: true
    })
  }
})

// GET /groups/search - 服务端搜索小组
app.get('/search', async c => {
  try {
    // 兼容 spec 的 q 参数与前端使用的 keyword 参数
    const keyword = (c.req.query('keyword') || c.req.query('q') || '').trim()
    if (!keyword) return c.json({ data: [], degraded: false })

    const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
    const cacheKey = `groups_search_${keyword}_${isChina ? 'cn' : 'global'}`
    const cached = cache.get(cacheKey)
    if (cached) return c.json({ data: cached.data, degraded: cached.degraded === true })

    const bases = getBaseUrls(isChina)
    const urls = bases.map(base => `${base}/group/all`)

    let groups = []
    let baseUrl = bases[0]
    let degraded = false
    try {
      const { html, url } = await fetchHTMLMulti(urls)
      baseUrl = url.replace(/\/group\/all\/?$/, '') || bases[0]
      try {
        groups = parseGroupListHTML(html, baseUrl)
      } catch {
        // 解析异常立即使用兜底数据
        groups = []
      }
    } catch {
      groups = []
    }

    if (groups.length < 10) {
      const fallback = FALLBACK_GROUPS.map(g => ({ ...g, url: `${baseUrl}/group/${g.id}` }))
      const seen = new Set(groups.map(g => g.id))
      for (const g of fallback) {
        if (!seen.has(g.id)) {
          seen.add(g.id)
          groups.push(g)
        }
      }
      degraded = true
    }

    const q = keyword.toLowerCase()
    const result = groups.filter(
      g =>
        (g.name || '').toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q)
    )

    cache.set(cacheKey, { data: result, degraded })
    return c.json({ data: result, degraded })
  } catch {
    return c.json({ data: [], degraded: true })
  }
})

// GET /groups/:id - 小组详情
app.get('/:id', async c => {
  try {
    const id = c.req.param('id')
    const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
    const cacheKey = `groups_detail_${id}_${isChina ? 'cn' : 'global'}`
    const cached = cache.get(cacheKey)
    if (cached) return c.json({ data: cached.data, degraded: cached.degraded === true })

    const bases = getBaseUrls(isChina)
    const urls = bases.map(base => `${base}/group/${id}`)

    try {
      const { html, url } = await fetchHTMLMulti(urls)
      const baseUrl =
        url.replace(new RegExp(`/group/${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$`), '') ||
        bases[0]
      let detail
      let degraded = false
      try {
        detail = parseGroupDetailHTML(html, id, baseUrl)
        // 占位数据：parseGroupDetailHTML 未能解析出真实小组名
        if (detail.name === id) degraded = true
      } catch {
        // 解析异常：构造带原站链接的兜底数据，避免 500
        const fallback = FALLBACK_GROUPS.find(g => g.id === id)
        detail = fallback
          ? { ...fallback, url: `${bases[0]}/group/${id}`, topics: [] }
          : {
              id,
              name: id,
              description: '',
              member_count: 0,
              avatar: '',
              url: `${bases[0]}/group/${id}`,
              topics: []
            }
        degraded = true
      }
      // 抓取成功：同时写入 TTL 缓存与「最近一次成功」长期缓存
      lastSuccessStore.set(id, detail)
      cache.set(cacheKey, { data: detail, degraded })
      return c.json({ data: detail, degraded })
    } catch {
      // 抓取失败：优先返回最近一次成功数据（如有）
      const lastSuccess = lastSuccessStore.get(id)
      if (lastSuccess) {
        // 命中最近成功缓存时，仍写入 TTL 缓存以减少上游压力
        cache.set(cacheKey, { data: lastSuccess, degraded: false })
        return c.json({ data: lastSuccess, degraded: false })
      }
      // 否则回退到 FALLBACK_GROUPS 中匹配项或基本占位
      const fallback = FALLBACK_GROUPS.find(g => g.id === id)
      const detail = fallback
        ? { ...fallback, url: `${bases[0]}/group/${id}`, topics: [] }
        : {
            id,
            name: id,
            description: '',
            member_count: 0,
            avatar: '',
            url: `${bases[0]}/group/${id}`,
            topics: []
          }
      cache.set(cacheKey, { data: detail, degraded: true })
      return c.json({ data: detail, degraded: true })
    }
  } catch {
    const id = c.req.param('id')
    return c.json({
      data: {
        id,
        name: id,
        description: '',
        member_count: 0,
        avatar: '',
        url: `${HOSTS.main}/group/${id}`,
        topics: []
      },
      degraded: true
    })
  }
})

export default app
