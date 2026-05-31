import { Hono } from 'hono'

const app = new Hono()

const cache = new Map()
const CACHE_TTL = 5 * 60 * 1000

async function fetchHTML(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'zh-CN,zh;q=0.9'
    }
  })
  const buf = await res.arrayBuffer()
  return new TextDecoder('utf-8').decode(buf)
}

function getAttr(html, tag, attr) {
  const m = html.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i'))
  return m ? m[1] : ''
}

function getText(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim()
}

function parseUserBlock(block) {
  const userLink = block.match(/<strong[^>]*>\s*<a[^>]*href="\/user\/([^"]*)"[^>]*>([^<]*)<\/a>/i)
  const avatarMatch = block.match(/url\(['"]?(https?:\/\/[^'"()]+|\/\/[^'"()]+)['"]?\)/i)
  let avatar = ''
  if (avatarMatch) {
    avatar = avatarMatch[1].startsWith('//') ? 'https:' + avatarMatch[1] : avatarMatch[1]
    avatar = avatar.replace('lain.bgm.tv', 'lain.bangumi.one')
  }
  return {
    username: userLink ? userLink[2].trim() : '',
    url: userLink ? '/user/' + userLink[1] : '',
    avatar
  }
}

function parseTalkbox(html) {
  const comments = []
  const rows = html.split(/<div[^>]*id="post_\d+"[^>]*class="[^"]*row_reply[^"]*"/i)
  for (let i = 1; i < rows.length && comments.length < 50; i++) {
    const row = rows[i]
    const idMatch = row.match(/^(\d+)/)
    const id = idMatch ? idMatch[1] : String(i)
    const floorMatch = row.match(/class="floor-anchor"[^>]*>#?(\d+)/i)
    const floor = floorMatch ? floorMatch[1] : ''
    const timeMatch = row.match(/class="floor-anchor"[^>]*>[^<]*<\/a>\s*<span[^>]*>([^<]*)<\/span>/i)
    const timestamp = timeMatch ? timeMatch[1].trim().replace(/^-\s*/, '') : ''
    const user = parseUserBlock(row)
    const contentMatch = row.match(/class="message"[^>]*>([\s\S]*?)<\/div>/i)
    const content = contentMatch ? getText(contentMatch[1]) : ''
    if (user.username && content) {
      comments.push({ id, floor, user, content, timestamp, replies: [] })
    }
  }
  return comments
}

function parseSubjectTalkbox(html) {
  const comments = []
  const items = html.split(/<div[^>]*class="[^"]*item[^"]*"[^>]*>/i)
  for (let i = 1; i < items.length && comments.length < 50; i++) {
    const item = items[i]
    const userLink = item.match(/<a[^>]*class="l"[^>]*href="\/user\/([^"]*)"[^>]*>([^<]*)<\/a>/i)
    if (!userLink) continue
    const avatarMatch = item.match(/url\(['"]?(https?:\/\/[^'"()]+|\/\/[^'"()]+)['"]?\)/i)
    let avatar = ''
    if (avatarMatch) {
      avatar = avatarMatch[1].startsWith('//') ? 'https:' + avatarMatch[1] : avatarMatch[1]
      avatar = avatar.replace('lain.bgm.tv', 'lain.bangumi.one')
    }
    const starMatch = item.match(/stars(\d+)/i)
    const timeMatch = item.match(/<small[^>]*class="grey"[^>]*>([^<]*)<\/small>/gi)
    const timestamp = timeMatch ? timeMatch[timeMatch.length - 1].replace(/<[^>]+>/g, '').trim().replace(/^@\s*/, '') : ''
    const contentMatch = item.match(/<p[^>]*class="comment"[^>]*>([\s\S]*?)<\/p>/i)
    const content = contentMatch ? getText(contentMatch[1]) : '(无文字评价)'
    comments.push({
      id: String(i),
      user: { username: userLink[2].trim(), url: '/user/' + userLink[1], avatar },
      rating: starMatch ? parseInt(starMatch[1]) : 0,
      content,
      timestamp
    })
  }
  return comments
}

function parseTopics(html) {
  const topics = []
  const rows = html.split(/<tr[^>]*>/i)
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const titleLink = row.match(/<td[^>]*class="[^"]*subject[^"]*"[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*(?:title="([^"]*)")?[^>]*>([^<]*)<\/a>/i)
    if (!titleLink) continue
    const href = titleLink[1]
    const title = titleLink[2] || titleLink[3]
    if (!href || !title) continue
    const authorLink = row.match(/<td[^>]*>\s*<a[^>]*href="\/user\/[^"]*"[^>]*>([^<]*)<\/a>/i)
    const repliesMatch = row.match(/class="grey"[^>]*>.*?(\d+).*?回复/i)
    const dateMatch = row.match(/<td[^>]*>\s*<small[^>]*class="grey"[^>]*>([^<]*)<\/small>/gi)
    const dateText = dateMatch ? dateMatch[dateMatch.length - 1].replace(/<[^>]+>/g, '').trim() : ''
    topics.push({
      id: href.split('/').pop(),
      title: title.trim(),
      href: `https://bgm.tv${href}`,
      author: authorLink ? authorLink[1].trim() : '',
      replies: repliesMatch ? parseInt(repliesMatch[1]) : 0,
      date: dateText
    })
  }
  return topics
}

function parseTopicPage(html) {
  const titleMatch = html.match(/<h1[^>]*class="[^"]*nameSingle[^"]*"[^>]*>\s*<a[^>]*>([^<]*)<\/a>/i) ||
                     html.match(/<title[^>]*>([^<]*)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : ''

  const opBlock = html.match(/<div[^>]*class="[^"]*postTopic[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*id="comment_list")/i)
  const op = {
    user: opBlock ? parseUserBlock(opBlock[0]) : { username: '', url: '', avatar: '' },
    content: opBlock ? getText((opBlock[0].match(/class="topic_content"[^>]*>([\s\S]*?)<\/div>/i) || ['', ''])[1]) : '',
    timestamp: opBlock ? (opBlock[0].match(/class="action"[^>]*>.*?<small[^>]*>([^<]*)<\/small>/is) || ['', ''])[1].replace(/#\d+\s*-?\s*/, '').trim() : '',
    title
  }

  const replies = []
  const replyBlocks = html.split(/<div[^>]*id="post_\d+"[^>]*class="[^"]*row_reply[^"]*"/i)
  for (let i = 1; i < replyBlocks.length && replies.length < 100; i++) {
    const block = replyBlocks[i]
    const idMatch = block.match(/^(\d+)/)
    const floorMatch = block.match(/class="floor-anchor"[^>]*>#?(\d+)/i)
    const timeMatch = block.match(/class="floor-anchor"[^>]*>[^<]*<\/a>\s*<span[^>]*>([^<]*)<\/span>/i)
    const user = parseUserBlock(block)
    const contentMatch = block.match(/class="message"[^>]*>([\s\S]*?)<\/div>/i)
    const content = contentMatch ? getText(contentMatch[1]) : ''
    if (user.username && content) {
      replies.push({
        id: idMatch ? idMatch[1] : String(i),
        floor: floorMatch ? floorMatch[1] : '',
        user,
        content,
        timestamp: timeMatch ? timeMatch[1].trim().replace(/^-\s*/, '') : '',
        replies: []
      })
    }
  }

  return { op, replies }
}

function getCached(key) {
  const c = cache.get(key)
  return (c && Date.now() - c.time < CACHE_TTL) ? c.data : null
}
function setCache(key, data) {
  cache.set(key, { data, time: Date.now() })
}

app.get('/test', async (c) => {
  return c.json({ ok: true })
})

app.get('/character/:id', async (c) => {
  try {
    const key = `char_${c.req.param('id')}`
    const cached = getCached(key)
    if (cached) return c.json({ data: cached })
    const res = await fetch(`https://bgm.tv/character/${c.req.param('id')}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      redirect: 'follow'
    })
    const html = await res.text()
    const comments = parseTalkbox(html)
    setCache(key, comments)
    return c.json({ data: comments })
  } catch (err) {
    return c.json({ error: '获取评论失败', detail: String(err) }, 500)
  }
})

app.get('/subject/:id', async (c) => {
  try {
    const key = `subj_${c.req.param('id')}`
    const cached = getCached(key)
    if (cached) return c.json({ data: cached })
    const html = await fetchHTML(`https://bgm.tv/subject/${c.req.param('id')}`)
    const comments = parseSubjectTalkbox(html)
    setCache(key, comments)
    return c.json({ data: comments })
  } catch (err) {
    return c.json({ error: '获取评论失败', detail: String(err) }, 500)
  }
})

app.get('/subject/:id/topics', async (c) => {
  try {
    const key = `topics_${c.req.param('id')}`
    const cached = getCached(key)
    if (cached) return c.json({ data: cached })
    const html = await fetchHTML(`https://bgm.tv/subject/${c.req.param('id')}/board`)
    const topics = parseTopics(html)
    setCache(key, topics)
    return c.json({ data: topics })
  } catch (err) {
    return c.json({ error: '获取讨论版失败', detail: String(err) }, 500)
  }
})

app.get('/topic/:topicId', async (c) => {
  try {
    const key = `topic_${c.req.param('topicId')}`
    const cached = getCached(key)
    if (cached) return c.json({ data: cached })
    const html = await fetchHTML(`https://bgm.tv/subject/topic/${c.req.param('topicId')}`)
    const topic = parseTopicPage(html)
    setCache(key, topic)
    return c.json({ data: topic })
  } catch (err) {
    return c.json({ error: '获取帖子内容失败', detail: String(err) }, 500)
  }
})

app.get('/person/:id', async (c) => {
  try {
    const key = `person_${c.req.param('id')}`
    const cached = getCached(key)
    if (cached) return c.json({ data: cached })
    const html = await fetchHTML(`https://bgm.tv/person/${c.req.param('id')}`)
    const comments = parseTalkbox(html)
    setCache(key, comments)
    return c.json({ data: comments })
  } catch (err) {
    return c.json({ error: '获取评论失败', detail: String(err) }, 500)
  }
})

export default app
