import { Hono } from 'hono'
import { parseHTML } from 'linkedom'

const app = new Hono()

const cache = new Map()
const CACHE_TTL = 5 * 60 * 1000

const BGM_TV = 'https://bgm.tv'
const BGM_PROXY = 'https://bangumi.one'

function getBase(isChina) {
  return isChina ? BGM_PROXY : BGM_TV
}

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

function parseUserLink(el) {
  const link = el.querySelector('strong > a[href^="/user/"], strong.userName > a[href^="/user/"]')
  const avatarEl = el.querySelector('.avatarNeue')
  const avatarStyle = avatarEl ? (avatarEl.getAttribute('style') || '') : ''
  const avatarMatch = avatarStyle.match(/url\(['"]?([^'"()]+)['"]?\)/)
  let avatar = ''
  if (avatarMatch) {
    avatar = avatarMatch[1].startsWith('//') ? 'https:' + avatarMatch[1] : avatarMatch[1]
    avatar = avatar.replace('lain.bgm.tv', 'lain.bangumi.one')
  }
  return {
    username: link ? link.textContent.trim() : '',
    url: link ? link.getAttribute('href') || '' : '',
    avatar
  }
}

function parseSubReplies($doc, el) {
  const replies = []
  const subReplies = el.querySelectorAll('.topic_sub_reply .sub_reply_bg')
  subReplies.forEach((subEl, j) => {
    const floorEl = subEl.querySelector('.floor-anchor')
    const floor = floorEl ? floorEl.textContent.replace('#', '').trim() : ''
    const actionText = floorEl ? floorEl.parentElement.textContent : ''
    const timestamp = actionText.replace(/#[\d-]+[\s-]*/, '').trim()
    const user = parseUserLink(subEl)
    const contentEl = subEl.querySelector('.cmt_sub_content')
    const content = contentEl ? contentEl.textContent.trim() : ''
    if (user.username && content) {
      replies.push({ id: subEl.id?.replace('post_', '') || String(j), floor, user, content, timestamp })
    }
  })
  return replies
}

function parseTalkbox(html) {
  const { document } = parseHTML(html)
  const comments = []
  const rows = document.querySelectorAll('#comment_list > .row_reply')
  rows.forEach((el, i) => {
    const floorEl = el.querySelector('.post_actions .floor-anchor')
    const floor = floorEl ? floorEl.textContent.replace('#', '').trim() : ''
    const actionText = floorEl ? floorEl.parentElement.textContent : ''
    const timestamp = actionText.replace(/#\S+\s*-?\s*/, '').trim()
    const user = parseUserLink(el)
    const contentEl = el.querySelector('.inner .message, .inner .reply_content .message')
    const content = contentEl ? contentEl.textContent.trim() : ''
    const replies = parseSubReplies(document, el)
    if (user.username && content) {
      comments.push({ id: el.id?.replace('post_', '') || String(i), floor, user, content, timestamp, replies })
    }
  })
  return comments
}

function parseSubjectTalkbox(html) {
  const { document } = parseHTML(html)
  const comments = []
  const items = document.querySelectorAll('#comment_box > .item')
  items.forEach((el, i) => {
    const userLink = el.querySelector('a.l[href^="/user/"]')
    if (!userLink) return
    const avatarEl = el.querySelector('.avatarNeue')
    const avatarStyle = avatarEl ? (avatarEl.getAttribute('style') || '') : ''
    const avatarMatch = avatarStyle.match(/url\(['"]?([^'"()]+)['"]?\)/)
    let avatar = ''
    if (avatarMatch) {
      avatar = avatarMatch[1].startsWith('//') ? 'https:' + avatarMatch[1] : avatarMatch[1]
      avatar = avatar.replace('lain.bgm.tv', 'lain.bangumi.one')
    }
    const starEl = el.querySelector('.starlight')
    const starClass = starEl ? (starEl.getAttribute('class') || '') : ''
    const starMatch = starClass.match(/stars(\d+)/)
    const timeEls = el.querySelectorAll('small.grey')
    const timestamp = timeEls.length ? timeEls[timeEls.length - 1].textContent.trim().replace(/^@\s*/, '') : ''
    const contentEl = el.querySelector('p.comment')
    const content = contentEl ? contentEl.textContent.trim() : '(无文字评价)'
    comments.push({
      id: String(i),
      user: { username: userLink.textContent.trim(), url: userLink.getAttribute('href') || '', avatar },
      rating: starMatch ? parseInt(starMatch[1]) : 0,
      content,
      timestamp
    })
  })
  return comments
}

function parseTopics(html) {
  const { document } = parseHTML(html)
  const topics = []
  const rows = document.querySelectorAll('table.topic_list tbody tr')
  rows.forEach((el) => {
    const titleLink = el.querySelector('td.subject a')
    const href = titleLink ? titleLink.getAttribute('href') || '' : ''
    const title = titleLink ? (titleLink.getAttribute('title') || titleLink.textContent.trim()) : ''
    if (!href || !title) return
    const authorLink = el.querySelector('td:nth-child(2) a')
    const repliesEl = el.querySelector('td:nth-child(3) small.grey')
    const repliesText = repliesEl ? repliesEl.textContent.trim() : ''
    const repliesMatch = repliesText.match(/(\d+)/)
    const dateEl = el.querySelector('td:nth-child(4) small.grey')
    const dateText = dateEl ? dateEl.textContent.trim() : ''
    topics.push({
      id: href.split('/').pop(),
      title,
      href: `https://bgm.tv${href}`,
      author: authorLink ? authorLink.textContent.trim() : '',
      replies: repliesMatch ? parseInt(repliesMatch[1]) : 0,
      date: dateText
    })
  })
  return topics
}

function parseTopicPage(html) {
  const { document } = parseHTML(html)

  const $op = document.querySelector('.postTopic')
  const op = {
    user: $op ? parseUserLink($op) : { username: '', url: '', avatar: '' },
    content: $op ? ($op.querySelector('.topic_content') || { textContent: '' }).textContent.trim() : '',
    timestamp: $op ? ($op.querySelector('.post_actions .action small') || { textContent: '' }).textContent.replace(/#\d+\s*-?\s*/, '').trim() : '',
    title: (document.querySelector('h1.nameSingle a, .headerNeueInner h1, title') || { textContent: '' }).textContent.trim()
  }

  const replies = []
  const replyRows = document.querySelectorAll('#comment_list > .row_reply')
  replyRows.forEach((el, i) => {
    const floorEl = el.querySelector('.post_actions .floor-anchor')
    const floor = floorEl ? floorEl.textContent.replace('#', '').trim() : ''
    const actionText = floorEl ? floorEl.parentElement.textContent : ''
    const timestamp = actionText.replace(/#\S+\s*-?\s*/, '').trim()
    const user = parseUserLink(el)
    const contentEl = el.querySelector('.message')
    const content = contentEl ? contentEl.textContent.trim() : ''
    if (user.username && content) {
      replies.push({
        id: el.id?.replace('post_', '') || String(i),
        floor,
        user,
        content,
        timestamp,
        replies: parseSubReplies(document, el)
      })
    }
  })

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
  return c.json({ ok: true, country: c.env?.CF_IP_COUNTRY || 'unknown' })
})

app.get('/character/:id', async (c) => {
  try {
    const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
    const key = `char_${c.req.param('id')}_${isChina}`
    const cached = getCached(key)
    if (cached) return c.json({ data: cached })
    const html = await fetchHTML(`${getBase(isChina)}/character/${c.req.param('id')}`)
    const comments = parseTalkbox(html)
    setCache(key, comments)
    return c.json({ data: comments })
  } catch (err) {
    return c.json({ error: '获取评论失败', detail: String(err) }, 500)
  }
})

app.get('/subject/:id', async (c) => {
  try {
    const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
    const key = `subj_${c.req.param('id')}_${isChina}`
    const cached = getCached(key)
    if (cached) return c.json({ data: cached })
    const html = await fetchHTML(`${getBase(isChina)}/subject/${c.req.param('id')}`)
    const comments = parseSubjectTalkbox(html)
    setCache(key, comments)
    return c.json({ data: comments })
  } catch (err) {
    return c.json({ error: '获取评论失败', detail: String(err) }, 500)
  }
})

app.get('/subject/:id/topics', async (c) => {
  try {
    const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
    const key = `topics_${c.req.param('id')}_${isChina}`
    const cached = getCached(key)
    if (cached) return c.json({ data: cached })
    const html = await fetchHTML(`${getBase(isChina)}/subject/${c.req.param('id')}/board`)
    const topics = parseTopics(html)
    setCache(key, topics)
    return c.json({ data: topics })
  } catch (err) {
    return c.json({ error: '获取讨论版失败', detail: String(err) }, 500)
  }
})

app.get('/topic/:topicId', async (c) => {
  try {
    const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
    const key = `topic_${c.req.param('topicId')}_${isChina}`
    const cached = getCached(key)
    if (cached) return c.json({ data: cached })
    const html = await fetchHTML(`${getBase(isChina)}/subject/topic/${c.req.param('topicId')}`)
    const topic = parseTopicPage(html)
    setCache(key, topic)
    return c.json({ data: topic })
  } catch (err) {
    return c.json({ error: '获取帖子内容失败', detail: String(err) }, 500)
  }
})

app.get('/person/:id', async (c) => {
  try {
    const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
    const key = `person_${c.req.param('id')}_${isChina}`
    const cached = getCached(key)
    if (cached) return c.json({ data: cached })
    const html = await fetchHTML(`${getBase(isChina)}/person/${c.req.param('id')}`)
    const comments = parseTalkbox(html)
    setCache(key, comments)
    return c.json({ data: comments })
  } catch (err) {
    return c.json({ error: '获取评论失败', detail: String(err) }, 500)
  }
})

export default app
