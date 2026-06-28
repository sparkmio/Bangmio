import { Hono } from 'hono'

const app = new Hono()
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0.36'

function getBase(isChina) {
  return isChina ? 'https://bangumi.lol' : 'https://bgm.tv'
}

async function fetchHTML(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'zh-CN' }
  })
  if (!res.ok) return ''
  return res.text()
}

// GET /groups - 热门小组列表
app.get('/', async (c) => {
  try {
    const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
    const base = getBase(isChina)
    const html = await fetchHTML(`${base}/group`)
    
    const groups = []
    // 抓取小组列表：每个小组在 .group-item 或类似结构中
    // bgm.tv 的小组列表 HTML：
    // <div class="group"> 或 <li class="group">
    const itemRegex = /<li[^>]*>[\s\S]*?<a href="\/group\/([^"]+)"[^>]*>[\s\S]*?<\/a>[\s\S]*?<\/li>/gi
    const items = html.match(itemRegex) || []
    
    for (const item of items.slice(0, 20)) {
      const idMatch = item.match(/href="\/group\/([^"]+)"/)
      const nameMatch = item.match(/>([^<]+)<\/a>/)
      const descMatch = item.match(/<small[^>]*>([^<]+)<\/small>/)
      
      if (idMatch && nameMatch) {
        groups.push({
          id: idMatch[1],
          name: nameMatch[1].trim(),
          description: descMatch ? descMatch[1].trim() : '',
          url: `${base}/group/${idMatch[1]}`
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
    
    // 提取小组信息
    const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/)
    const descMatch = html.match(/<div class="text">([\s\S]*?)<\/div>/)
    
    // 提取话题列表
    const topics = []
    const topicRegex = /<a href="\/group\/topic\/([^"]+)"[^>]*>([^<]+)<\/a>/gi
    const topicMatches = html.match(topicRegex) || []
    for (const t of topicMatches.slice(0, 10)) {
      const m = t.match(/href="\/group\/topic\/([^"]+)"[^>]*>([^<]+)<\/a>/)
      if (m) topics.push({ id: m[1], title: m[2].trim() })
    }
    
    return c.json({
      data: {
        id,
        name: nameMatch ? nameMatch[1].trim() : id,
        description: descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '',
        topics
      }
    })
  } catch {
    return c.json({ data: null })
  }
})

export default app
