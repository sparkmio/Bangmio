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

// GET /groups - 小组列表
app.get('/', async (c) => {
  try {
    const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
    const base = getBase(isChina)
    const html = await fetchHTML(`${base}/group`)
    if (!html) return c.json({ data: [] })

    const groups = []
    const seen = new Set()

    // bgm.tv 小组列表结构：每个小组在 <li> 中，含 <a href="/group/{id}"> 名称、
    // <span class="group_member"> 成员数、<small> 简介、<img> 头像
    // 按 <li 分割后逐块解析
    const chunks = html.split(/<li\b/i)
    for (const chunk of chunks) {
      const linkMatch = chunk.match(/href="\/group\/(?!topic\/)([^"\/?#]+)/i)
      if (!linkMatch) continue
      const id = linkMatch[1]
      if (seen.has(id)) continue

      // 必须包含小组特征标记（成员数或简介），排除导航链接等
      const hasGroupMarker = /group_member|<small\b/i.test(chunk)
      if (!hasGroupMarker) continue

      seen.add(id)

      // 名称：取该链接的文本
      const nameRe = new RegExp(`href="/group/${escapeRegex(id)}"[^>]*>([\\s\\S]*?)<\\/a>`, 'i')
      const nameMatch = chunk.match(nameRe)
      const name = nameMatch ? unescapeHtml(stripTags(nameMatch[1])) : id

      // 简介
      const descMatch = chunk.match(/<small[^>]*>([\s\S]*?)<\/small>/i)
      const description = descMatch ? unescapeHtml(stripTags(descMatch[1])) : ''

      // 成员数
      const memberMatch = chunk.match(/group_member[^>]*>([\s\S]*?)<\//i)
      const member_count = memberMatch ? parseNumber(memberMatch[1]) : 0

      // 头像
      const avatarMatch = chunk.match(/<img[^>]*src="([^"]+)"/i)
      const avatar = avatarMatch ? fixUrl(avatarMatch[1], base) : ''

      groups.push({
        id,
        name,
        description,
        member_count,
        avatar,
        url: `${base}/group/${id}`
      })
      if (groups.length >= 30) break
    }

    // 如果通过 <li> 提取不足 20 个，从侧边栏/主区域补充简单链接
    if (groups.length < 20) {
      const linkRegex = /href="\/group\/(?!topic\/)([^"\/?#]+)"[^>]*>([^<]+)<\/a>/gi
      let m
      while ((m = linkRegex.exec(html)) !== null && groups.length < 25) {
        const id = m[1]
        if (seen.has(id)) continue
        seen.add(id)
        groups.push({
          id,
          name: unescapeHtml(m[2].trim()),
          description: '',
          member_count: 0,
          avatar: '',
          url: `${base}/group/${id}`
        })
      }
    }

    return c.json({ data: groups })
  } catch {
    return c.json({ data: [] })
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

    // 名称：从 <h1> 提取
    const nameMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
    const name = nameMatch ? unescapeHtml(stripTags(nameMatch[1])) : id

    // 简介：尝试多种容器
    let description = ''
    const descPatterns = [
      /<div[^>]*class="[^"]*groupInfo[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*group_intro[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*side[^"]*groupIntro[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<small[^>]*>([\s\S]*?)<\/small>/i,
      /<div[^>]*class="[^"]*text[^"]*"[^>]*>([\s\S]*?)<\/div>/i
    ]
    for (const re of descPatterns) {
      const m = html.match(re)
      if (m && stripTags(m[1])) {
        description = unescapeHtml(stripTags(m[1]))
        break
      }
    }

    // 成员数
    const memberMatch = html.match(/group_member[^>]*>([\s\S]*?)<\//i)
    const member_count = memberMatch ? parseNumber(memberMatch[1]) : 0

    // 话题列表：按 <li 分割，查找包含 /group/topic/ 的块
    const topics = []
    const tChunks = html.split(/<li\b/i)
    for (const chunk of tChunks) {
      const tLinkMatch = chunk.match(/href="\/group\/topic\/([^"\/?#]+)"/i)
      if (!tLinkMatch) continue

      const topicId = tLinkMatch[1]
      const titleMatch = chunk.match(/href="\/group\/topic\/[^"\/?#]+"[^>]*>([\s\S]*?)<\/a>/i)
      const authorMatch = chunk.match(/href="\/user\/[^"]+"[^>]*>([^<]+)<\/a>/i)

      // 回复数：多种模式
      let reply_count = 0
      const replyMatch =
        chunk.match(/class="[^"]*reply[^"]*"[^>]*>[^<]*(\d+)/i) ||
        chunk.match(/(\d+)\s*(?:reply|回复)/i) ||
        chunk.match(/<span[^>]*>\s*(\d+)\s*<\/span>\s*<span[^>]*class="[^"]*time/i)
      if (replyMatch) reply_count = parseNumber(replyMatch[1])

      // 最后回复时间
      let last_reply_time = ''
      const timeMatch =
        chunk.match(/class="[^"]*time[^"]*"[^>]*>([^<]+)<\/span>/i) ||
        chunk.match(/class="[^"]*tip_j[^"]*"[^>]*>([^<]+)<\/span>/i) ||
        chunk.match(/<small[^>]*class="[^"]*"[^>]*>([^<]+)<\/small>/i)
      if (timeMatch) last_reply_time = unescapeHtml(stripTags(timeMatch[1]))

      topics.push({
        id: topicId,
        title: titleMatch ? unescapeHtml(stripTags(titleMatch[1])) : '',
        author: authorMatch ? unescapeHtml(stripTags(authorMatch[1])) : '',
        reply_count,
        last_reply_time
      })
      if (topics.length >= 20) break
    }

    return c.json({
      data: {
        id,
        name,
        description,
        member_count,
        topics
      }
    })
  } catch {
    return c.json({ data: null })
  }
})

export default app
