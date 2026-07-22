import { Hono } from 'hono'
import { createCache } from '../utils/cache.js'
import { fetchHTMLMulti, stripTags, unescapeHtml, parseNumber, fixUrl } from '../utils/http.js'
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

function parseGroupListHTML(html, base) {
  const groups = []
  const seen = new Set()

  // Bangumi /group/all 页面格式：
  // * **[ ![](icon) name](/group/id)** X 位成员
  // 按每个 <li> 或 <a href="/group/xxx"> 解析
  const regex = /<a[^>]+href="\/group\/([^"/]+)"[^>]*>([\s\S]*?)<\/a>/gi
  let m
  while ((m = regex.exec(html)) !== null) {
    const id = unescapeHtml(m[1]).trim()
    const rawAnchor = m[0]
    const rawName = m[2]

    // 过滤非小组链接
    if (/\.(jpg|png|gif)$/i.test(id)) continue
    if (/^\d+$/.test(id)) continue
    if (id === 'new_topic' || id.startsWith('topic')) continue
    if (id === 'discover' || id === 'all' || id === 'category') continue

    // 提取名称：去掉 img，保留文字
    const name = unescapeHtml(stripTags(rawName).replace(/\s+/g, ' ')).trim()
    if (!name || /^\d+$/.test(name)) continue

    // 上下文：从 </a> 后开始到下一个 "位成员" 或行尾
    const afterAnchor = html.slice(
      m.index + rawAnchor.length,
      Math.min(html.length, m.index + rawAnchor.length + 120)
    )

    // 成员数
    let member_count = 0
    const memberMatch = afterAnchor.match(/([0-9]+)\s*(?:位成员|成员|members?)/i)
    if (memberMatch) {
      member_count = parseNumber(memberMatch[1])
    }

    // 头像：在当前 anchor 内或前一个 img 找
    let avatar = ''
    const imgMatch =
      rawAnchor.match(/<img[^>]+src="([^"]+)"[^>]*>/i) ||
      html.slice(Math.max(0, m.index - 200), m.index).match(/<img[^>]+src="([^"]+)"[^>]*>$/i)
    if (imgMatch) {
      avatar = fixUrl(imgMatch[1], base)
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

function parseGroupDetailHTML(html, id, base) {
  const nameMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  const name = nameMatch ? unescapeHtml(stripTags(nameMatch[1])) : id

  // 简介：新版 Bangumi 小组详情页
  let description = ''
  const descPatterns = [
    /<div[^>]*class="[^"]*group_desc[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*text[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*intro[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<p[^>]*class="[^"]*tip[^"]*"[^>]*>([\s\S]*?)<\/p>/i
  ]
  for (const re of descPatterns) {
    const m = html.match(re)
    if (m) {
      const text = unescapeHtml(stripTags(m[1]))
      if (text) {
        description = text
        break
      }
    }
  }

  // 成员数
  let member_count = 0
  const memberMatch =
    html.match(/([0-9,]+)\s*(?:位成员|成员|members?)/i) ||
    html.match(
      /<span[^>]*class="[^"]*(?:group_member|member|sub)[^"]*"[^>]*>([\s\S]*?)<\/span>/i
    ) ||
    html.match(/<strong>([0-9,]+)<\/strong>\s*(?:位成员|成员|members?)/i)
  if (memberMatch) {
    member_count = parseNumber(memberMatch[1])
  }

  // 头像
  let avatar = ''
  const h1Idx = html.search(/<h1\b/i)
  if (h1Idx !== -1) {
    const headContext = html.slice(Math.max(0, h1Idx - 500), h1Idx + 500)
    const avatarMatch = headContext.match(/<img[^>]+src="([^"]+)"[^>]*>/i)
    avatar = avatarMatch ? fixUrl(avatarMatch[1], base) : ''
  }

  // 话题：仅在 .topic_list 表格内解析，避免导航栏的 Mobile 链接被误匹配
  const topics = []
  const seenTopics = new Set()
  const tableMatch = html.match(/<table[^>]*class="[^"]*topic_list[^"]*"[^>]*>([\s\S]*?)<\/table>/i)
  const topicContext = tableMatch ? tableMatch[1] : ''
  if (topicContext) {
    const topicRegex = /<a[^>]+href="\/group\/topic\/(\d+)"[^>]*>([\s\S]*?)<\/a>/gi
    let tm
    while ((tm = topicRegex.exec(topicContext)) !== null) {
      const topicId = tm[1]
      if (seenTopics.has(topicId)) continue
      seenTopics.add(topicId)

      const title = unescapeHtml(stripTags(tm[2]).replace(/\s+/g, ' '))
      if (!title) continue

      const idx = tm.index
      const context = topicContext.slice(
        Math.max(0, idx - 400),
        Math.min(topicContext.length, idx + 600)
      )

      // 作者
      let author = ''
      const authorMatch = context.match(/<a[^>]+href="\/user\/[^"]+"[^>]*>([\s\S]*?)<\/a>/i)
      if (authorMatch) {
        author = unescapeHtml(stripTags(authorMatch[1]))
      }

      // 回复数
      let reply_count = 0
      const replyMatch =
        context.match(/<td[^>]*class="[^"]*posts[^"]*"[^>]*>([\s\S]*?)<\/td>/i) ||
        context.match(/\((\d+)\s*(?:回复|reply|条)/i) ||
        context.match(/(\d+)\s*(?:回复|reply)/i)
      if (replyMatch) {
        reply_count = parseNumber(replyMatch[1])
      }

      // 最后回复时间
      let last_reply_time = ''
      const timeMatch =
        context.match(/<small[^>]*class="[^"]*time[^"]*"[^>]*>([\s\S]*?)<\/small>/i) ||
        context.match(/<span[^>]*class="[^"]*date[^"]*"[^>]*>([\s\S]*?)<\/span>/i) ||
        context.match(/<span[^>]*class="[^"]*time[^"]*"[^>]*>([\s\S]*?)<\/span>/i) ||
        context.match(/<small[^>]*>([\s\S]*?)<\/small>/i)
      if (timeMatch) {
        const timeText = unescapeHtml(stripTags(timeMatch[1]))
        if (!/^\d+\s*(?:位成员|成员|members?)$/.test(timeText)) {
          last_reply_time = timeText
        }
      }

      topics.push({ id: topicId, title, author, reply_count, last_reply_time })
      if (topics.length >= 20) break
    }
  }

  return { id, name, description, member_count, avatar, topics, url: `${base}/group/${id}` }
}

// GET /groups - 小组列表
app.get('/', async c => {
  try {
    const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
    const cacheKey = `groups_list_${isChina ? 'cn' : 'global'}`
    const cached = cache.get(cacheKey)
    if (cached) return c.json({ data: cached })

    const bases = getBaseUrls(isChina)
    const urls = bases.map(base => `${base}/group/all`)

    let groups = []
    let baseUrl = bases[0]
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
    }

    cache.set(cacheKey, groups)
    return c.json({ data: groups })
  } catch {
    return c.json({
      data: FALLBACK_GROUPS.map(g => ({ ...g, url: `${HOSTS.main}/group/${g.id}` }))
    })
  }
})

// GET /groups/search - 服务端搜索小组
app.get('/search', async c => {
  try {
    // 兼容 spec 的 q 参数与前端使用的 keyword 参数
    const keyword = (c.req.query('keyword') || c.req.query('q') || '').trim()
    if (!keyword) return c.json({ data: [] })

    const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
    const cacheKey = `groups_search_${keyword}_${isChina ? 'cn' : 'global'}`
    const cached = cache.get(cacheKey)
    if (cached) return c.json({ data: cached })

    const bases = getBaseUrls(isChina)
    const urls = bases.map(base => `${base}/group/all`)

    let groups = []
    let baseUrl = bases[0]
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
    }

    const q = keyword.toLowerCase()
    const result = groups.filter(
      g =>
        (g.name || '').toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q)
    )

    cache.set(cacheKey, result)
    return c.json({ data: result })
  } catch {
    return c.json({ data: [] })
  }
})

// GET /groups/:id - 小组详情
app.get('/:id', async c => {
  try {
    const id = c.req.param('id')
    const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
    const cacheKey = `groups_detail_${id}_${isChina ? 'cn' : 'global'}`
    const cached = cache.get(cacheKey)
    if (cached) return c.json({ data: cached })

    const bases = getBaseUrls(isChina)
    const urls = bases.map(base => `${base}/group/${id}`)

    try {
      const { html, url } = await fetchHTMLMulti(urls)
      const baseUrl =
        url.replace(new RegExp(`/group/${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$`), '') ||
        bases[0]
      let detail
      try {
        detail = parseGroupDetailHTML(html, id, baseUrl)
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
      }
      // 抓取成功：同时写入 TTL 缓存与「最近一次成功」长期缓存
      lastSuccessStore.set(id, detail)
      cache.set(cacheKey, detail)
      return c.json({ data: detail })
    } catch {
      // 抓取失败：优先返回最近一次成功数据（如有）
      const lastSuccess = lastSuccessStore.get(id)
      if (lastSuccess) {
        // 命中最近成功缓存时，仍写入 TTL 缓存以减少上游压力
        cache.set(cacheKey, lastSuccess)
        return c.json({ data: lastSuccess })
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
      cache.set(cacheKey, detail)
      return c.json({ data: detail })
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
      }
    })
  }
})

export default app
