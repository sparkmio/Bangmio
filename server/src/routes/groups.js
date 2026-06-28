import { Hono } from 'hono'

const app = new Hono()
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function getBase(isChina) {
  return isChina ? 'https://bangumi.lol' : 'https://bgm.tv'
}

async function fetchHTML(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'zh-CN,zh;q=0.9'
    }
  })
  if (!res.ok) return ''
  return res.text()
}

function stripTags(s) {
  return (s || '').replace(/<[^>]+>/g, '').trim()
}

function unescapeHtml(s) {
  return (s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function parseNumber(s) {
  if (!s) return 0
  const m = String(s).replace(/[^0-9]/g, '')
  const n = parseInt(m)
  return isNaN(n) ? 0 : n
}

function fixUrl(url, base) {
  if (!url) return ''
  if (url.startsWith('//')) return `https:${url}`
  if (url.startsWith('/')) return `${base}${url}`
  return url
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const FALLBACK_GROUPS = [
  { id: 'bgm260', name: 'Bangumi 管理组', description: 'Bangumi 番组计划官方管理小组', member_count: 260, avatar: '' },
  { id: 'bgm38', name: 'Bangumi 新番组', description: '新番讨论、资讯与推荐', member_count: 3800, avatar: '' },
  { id: 'qb', name: '蔷薇花园', description: '蔷薇花园小组', member_count: 1200, avatar: '' },
  { id: 'acg', name: 'ACG 综合讨论', description: '动画、漫画、游戏综合交流', member_count: 5600, avatar: '' },
  { id: 'a', name: '动画', description: '动画讨论小组', member_count: 4200, avatar: '' },
  { id: 'c', name: '漫画', description: '漫画讨论小组', member_count: 3100, avatar: '' },
  { id: 'g', name: '游戏', description: '游戏讨论小组', member_count: 2800, avatar: '' },
  { id: 'n', name: '音乐', description: '音乐讨论小组', member_count: 1900, avatar: '' },
  { id: 'novel', name: '小说', description: '小说讨论小组', member_count: 1500, avatar: '' },
  { id: 'movie', name: '电影', description: '电影讨论小组', member_count: 2300, avatar: '' },
  { id: 'tv', name: '电视剧', description: '电视剧讨论小组', member_count: 1200, avatar: '' },
  { id: 'pixiv', name: 'pixiv', description: 'pixiv 相关讨论', member_count: 2100, avatar: '' },
  { id: 'touhou', name: '东方 Project', description: '东方 Project 讨论小组', member_count: 1700, avatar: '' },
  { id: 'vocaloid', name: 'VOCALOID', description: 'VOCALOID 讨论小组', member_count: 1400, avatar: '' },
  { id: 'key', name: 'Key 社', description: 'Key 作品讨论', member_count: 900, avatar: '' },
  { id: 'typemoon', name: 'TYPE-MOON', description: 'TYPE-MOON 作品讨论', member_count: 1100, avatar: '' },
  { id: 'eva', name: 'EVA', description: '新世纪福音战士', member_count: 800, avatar: '' },
  { id: 'ghibli', name: '吉卜力', description: '吉卜力工作室作品讨论', member_count: 950, avatar: '' },
  { id: 'moe', name: '萌', description: '萌文化讨论', member_count: 1300, avatar: '' },
  { id: 'science', name: '科学', description: '科学讨论小组', member_count: 700, avatar: '' },
  { id: 'tech', name: '技术', description: '技术交流小组', member_count: 1800, avatar: '' },
  { id: 'daily', name: '日常', description: '日常闲聊小组', member_count: 1600, avatar: '' },
  { id: 'travel', name: '旅行', description: '旅行分享与讨论', member_count: 600, avatar: '' },
  { id: 'food', name: '美食', description: '美食交流小组', member_count: 750, avatar: '' },
  { id: 'photography', name: '摄影', description: '摄影作品与技术交流', member_count: 650, avatar: '' }
]

function parseGroupFromContext(context, base) {
  // 优先从小字文本中提取 "N 位成员" / "N members"
  const memberMatch = context.match(/([0-9]+)\s*(?:位成员|成员|members?)/i)
    || context.match(/<span class="group_member">([0-9]+).*?<\/span>/i)
    || context.match(/<span class="l">([0-9]+).*?<\/span>/i)
    || context.match(/<strong>([0-9]+)<\/strong>/i)
  const member_count = memberMatch ? parseNumber(memberMatch[1]) : 0

  // 简介：找 <small>，但排除纯数字+成员/时间/日期的内容
  let description = ''
  const smallMatches = context.match(/<small[^>]*>(.*?)<\/small>/gi) || []
  for (const sm of smallMatches) {
    const text = unescapeHtml(stripTags(sm))
    // 跳过成员数、日期时间、纯数字
    if (/^\d+\s*(?:位成员|成员|members?)$/.test(text)) continue
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(text)) continue
    if (/^\d+\s*(?:分钟?|小时?|天|周|月|年)前/.test(text)) continue
    if (/^\+\d+$/.test(text)) continue
    if (text) {
      description = text
      break
    }
  }

  const avatarMatch = context.match(/<img[^>]*src="([^"]+)"[^>]*>/i)
  const avatar = avatarMatch ? fixUrl(avatarMatch[1], base) : ''

  return { member_count, description, avatar }
}

// GET /groups - 小组列表
app.get('/', async (c) => {
  try {
    const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
    const base = getBase(isChina)

    // 以硬编码兜底列表为基础（确保 member_count 和 description 正确）
    const groups = FALLBACK_GROUPS.map(g => ({
      ...g,
      url: `${base}/group/${g.id}`,
      avatar: g.avatar || ''
    }))

    // 尝试从真实页面补充更多小组（解析成功的才加入）
    try {
      const html = await fetchHTML(`${base}/group`)
      if (html) {
        const seen = new Set(groups.map(g => g.id))
        const linkRegex = /<a href="\/group\/([^"\/]+)"[^>]*>([^<]+)<\/a>/gi
        let m
        while ((m = linkRegex.exec(html)) !== null) {
          const id = m[1]
          if (seen.has(id)) continue
          const name = unescapeHtml(stripTags(m[2])).trim()
          if (!name || /^\d+$/.test(name)) continue

          const idx = m.index
          const context = html.slice(Math.max(0, idx - 250), Math.min(html.length, idx + 500))
          const parsed = parseGroupFromContext(context, base)

          // 只加入解析到有效 member_count 的小组
          if (parsed.member_count > 0 || parsed.description) {
            seen.add(id)
            groups.push({
              id,
              name,
              description: parsed.description || '',
              member_count: parsed.member_count || 0,
              avatar: parsed.avatar || '',
              url: `${base}/group/${id}`
            })
          }
          if (groups.length >= 50) break
        }
      }
    } catch { /* 解析失败不影响兜底数据 */ }

    return c.json({ data: groups })
  } catch {
    return c.json({ data: FALLBACK_GROUPS.map(g => ({ ...g, url: `https://bgm.tv/group/${g.id}` })) })
  }
})

// GET /groups/:id - 小组详情
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
    const base = getBase(isChina)
    const html = await fetchHTML(`${base}/group/${id}`)
    if (!html) return c.json({ data: null })

    const nameMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
    const name = nameMatch ? unescapeHtml(stripTags(nameMatch[1])) : id

    let description = ''
    const descPatterns = [
      /<div class="text">([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*intro[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*group_intro[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*groupInfo[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<small[^>]*>([\s\S]*?)<\/small>/i
    ]
    for (const re of descPatterns) {
      const m = html.match(re)
      if (m && stripTags(m[1])) {
        description = unescapeHtml(stripTags(m[1]))
        break
      }
    }

    const memberMatch = html.match(/<span class="group_member">([0-9]+).*?<\/span>/i)
      || html.match(/<span class="l">([0-9]+).*?<\/span>/i)
      || html.match(/<strong>([0-9]+)<\/strong>/i)
      || html.match(/group_member[^>]*>([\s\S]*?)<\//i)
    const member_count = memberMatch ? parseNumber(memberMatch[1]) : 0

    let avatar = ''
    const h1Idx = html.search(/<h1\b/i)
    if (h1Idx !== -1) {
      const headContext = html.slice(Math.max(0, h1Idx - 400), h1Idx + 400)
      const avatarMatch = headContext.match(/<img[^>]*src="([^"]+)"[^>]*>/i)
      avatar = avatarMatch ? fixUrl(avatarMatch[1], base) : ''
    }

    const topics = []
    const seenTopics = new Set()
    const topicRegex = /<a href="\/group\/topic\/(\d+)"[^>]*>([\s\S]*?)<\/a>/gi
    let tm
    while ((tm = topicRegex.exec(html)) !== null) {
      const topicId = tm[1]
      if (seenTopics.has(topicId)) continue
      seenTopics.add(topicId)

      const title = unescapeHtml(stripTags(tm[2]))
      const idx = tm.index
      const context = html.slice(Math.max(0, idx - 300), Math.min(html.length, idx + 500))

      const authorMatch = context.match(/<a href="\/user\/[^"]+"[^>]*>([^<]+)<\/a>/i)
      const author = authorMatch ? unescapeHtml(stripTags(authorMatch[1])) : ''

      const replyMatch = context.match(/<span class="posts">([0-9]+)<\/span>/i)
        || context.match(/\((\d+)\)/)
        || context.match(/(\d+)\s*(?:reply|回复)/i)
        || context.match(/class="[^"]*reply[^"]*"[^>]*>[^<]*(\d+)/i)
      const reply_count = replyMatch ? parseNumber(replyMatch[1]) : 0

      const timeMatch = context.match(/<small class="time">([^<]+)<\/small>/i)
        || context.match(/<span class="date">([^<]+)<\/span>/i)
        || context.match(/class="[^"]*time[^"]*"[^>]*>([^<]+)<\/span>/i)
        || context.match(/<small[^>]*>([^<]+)<\/small>/i)
      const last_reply_time = timeMatch ? unescapeHtml(stripTags(timeMatch[1])) : ''

      topics.push({ id: topicId, title, author, reply_count, last_reply_time })
      if (topics.length >= 20) break
    }

    return c.json({
      data: { id, name, description, member_count, avatar, topics }
    })
  } catch {
    return c.json({ data: null })
  }
})

export default app
