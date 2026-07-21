import { Hono } from 'hono'
import { parseHTML } from 'linkedom'
import { createCache } from '../utils/cache.js'
import { fetchHTML } from '../utils/http.js'
import { CACHE_TTL_COMMENTS, MAX_CONTENT_LENGTH, MAX_TITLE_LENGTH } from '../config.js'

const app = new Hono()

const cache = createCache(CACHE_TTL_COMMENTS)

const BGM_TV = 'https://bgm.tv'
const BGM_PROXY = 'https://bangumi.lol'

function getBase(isChina) {
  return isChina ? BGM_PROXY : BGM_TV
}

function parseUserLink(el) {
  const link = el.querySelector('strong > a[href^="/user/"], strong.userName > a[href^="/user/"]')
  const avatarEl = el.querySelector('.avatarNeue')
  const avatarStyle = avatarEl ? avatarEl.getAttribute('style') || '' : ''
  const avatarMatch = avatarStyle.match(/url\(['"]?([^'"()]+)['"]?\)/)
  let avatar = ''
  if (avatarMatch) {
    avatar = avatarMatch[1].startsWith('//') ? 'https:' + avatarMatch[1] : avatarMatch[1]
    avatar = avatar.replace('lain.bgm.tv', 'lain.bangumi.lol')
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
      replies.push({
        id: subEl.id?.replace('post_', '') || String(j),
        floor,
        user,
        content,
        timestamp
      })
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
      comments.push({
        id: el.id?.replace('post_', '') || String(i),
        floor,
        user,
        content,
        timestamp,
        replies
      })
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
    const avatarStyle = avatarEl ? avatarEl.getAttribute('style') || '' : ''
    const avatarMatch = avatarStyle.match(/url\(['"]?([^'"()]+)['"]?\)/)
    let avatar = ''
    if (avatarMatch) {
      avatar = avatarMatch[1].startsWith('//') ? 'https:' + avatarMatch[1] : avatarMatch[1]
      avatar = avatar.replace('lain.bgm.tv', 'lain.bangumi.lol')
    }
    const starEl = el.querySelector('.starlight')
    const starClass = starEl ? starEl.getAttribute('class') || '' : ''
    const starMatch = starClass.match(/stars(\d+)/)
    const timeEls = el.querySelectorAll('small.grey')
    const timestamp = timeEls.length
      ? timeEls[timeEls.length - 1].textContent.trim().replace(/^@\s*/, '')
      : ''
    const contentEl = el.querySelector('p.comment')
    const content = contentEl ? contentEl.textContent.trim() : '(无文字评价)'
    comments.push({
      id: String(i),
      user: {
        username: userLink.textContent.trim(),
        url: userLink.getAttribute('href') || '',
        avatar
      },
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
  rows.forEach(el => {
    const titleLink = el.querySelector('td.subject a')
    const href = titleLink ? titleLink.getAttribute('href') || '' : ''
    const title = titleLink ? titleLink.getAttribute('title') || titleLink.textContent.trim() : ''
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
    content: $op
      ? ($op.querySelector('.topic_content') || { textContent: '' }).textContent.trim()
      : '',
    timestamp: $op
      ? ($op.querySelector('.post_actions .action small') || { textContent: '' }).textContent
          .replace(/#\d+\s*-?\s*/, '')
          .trim()
      : '',
    title: (
      document.querySelector('h1.nameSingle a, .headerNeueInner h1, title') || { textContent: '' }
    ).textContent.trim()
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

app.get('/test', async c => {
  return c.json({ ok: true, country: c.env?.CF_IP_COUNTRY || 'unknown' })
})

app.get('/character/:id', async c => {
  try {
    const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
    const key = `char_${c.req.param('id')}_${isChina}`
    const cached = cache.get(key)
    if (cached) return c.json({ data: cached })
    const html = await fetchHTML(`${getBase(isChina)}/character/${c.req.param('id')}`)
    const comments = parseTalkbox(html)
    cache.set(key, comments)
    return c.json({ data: comments })
  } catch (err) {
    return c.json({ error: '获取评论失败', detail: String(err) }, 500)
  }
})

app.get('/subject/:id', async c => {
  try {
    const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
    const key = `subj_${c.req.param('id')}_${isChina}`
    const cached = cache.get(key)
    if (cached) return c.json({ data: cached })
    const html = await fetchHTML(`${getBase(isChina)}/subject/${c.req.param('id')}`)
    const comments = parseSubjectTalkbox(html)
    cache.set(key, comments)
    return c.json({ data: comments })
  } catch (err) {
    return c.json({ error: '获取评论失败', detail: String(err) }, 500)
  }
})

app.get('/subject/:id/topics', async c => {
  try {
    const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
    const key = `topics_${c.req.param('id')}_${isChina}`
    const cached = cache.get(key)
    if (cached) return c.json({ data: cached })
    const html = await fetchHTML(`${getBase(isChina)}/subject/${c.req.param('id')}/board`)
    const topics = parseTopics(html)
    cache.set(key, topics)
    return c.json({ data: topics })
  } catch (err) {
    return c.json({ error: '获取讨论版失败', detail: String(err) }, 500)
  }
})

app.get('/topic/:topicId', async c => {
  try {
    const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
    const key = `topic_${c.req.param('topicId')}_${isChina}`
    const cached = cache.get(key)
    if (cached) return c.json({ data: cached })
    const html = await fetchHTML(`${getBase(isChina)}/subject/topic/${c.req.param('topicId')}`)
    const topic = parseTopicPage(html)
    cache.set(key, topic)
    return c.json({ data: topic })
  } catch (err) {
    return c.json({ error: '获取帖子内容失败', detail: String(err) }, 500)
  }
})

app.get('/person/:id', async c => {
  try {
    const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
    const key = `person_${c.req.param('id')}_${isChina}`
    const cached = cache.get(key)
    if (cached) return c.json({ data: cached })
    const html = await fetchHTML(`${getBase(isChina)}/person/${c.req.param('id')}`)
    const comments = parseTalkbox(html)
    cache.set(key, comments)
    return c.json({ data: comments })
  } catch (err) {
    return c.json({ error: '获取评论失败', detail: String(err) }, 500)
  }
})

// ===== POST routes for comment posting =====

function extractFormhash(html) {
  const m = html.match(/name="formhash"\s+value="([^"]+)"/i)
  return m ? m[1] : null
}

function extractChiiAuth(token) {
  return `chii_auth=${token}; chii_cookietime=2592000`
}

app.post('/subject/:id/comment', async c => {
  try {
    const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
    const base = getBase(isChina)
    const token = (c.req.header('Authorization') || '').replace('Bearer ', '')
    if (!token) return c.json({ error: '未登录' }, 401)
    const { content } = await c.req.json()
    if (!content) return c.json({ error: '内容不能为空' }, 400)
    if (content.length > MAX_CONTENT_LENGTH)
      return c.json({ data: null, error: '内容过长', code: 400 }, 400)

    const subjectId = c.req.param('id')
    const pageHtml = await fetchHTML(`${base}/subject/${subjectId}/comments`, {
      headers: { Authorization: `Bearer ${token}`, Cookie: `chii_auth=${token}` }
    })
    const formhash = extractFormhash(pageHtml)
    if (!formhash) return c.json({ error: '无法获取表单 token，请重新登录' }, 400)

    const cookie = extractChiiAuth(token)
    const params = new URLSearchParams()
    params.append('formhash', formhash)
    params.append('comment_content', content)
    params.append('submit', 'submit')

    const res = await fetch(`${base}/subject/${subjectId}/comment`, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookie,
        Referer: `${base}/subject/${subjectId}`
      },
      body: params.toString(),
      redirect: 'manual'
    })

    if (res.status >= 300 && res.status < 400) return c.json({ success: true })
    if (res.ok) return c.json({ success: true })
    const body = await res.text()
    return c.json({ error: '发送失败', detail: body.slice(0, 200) }, 400)
  } catch (err) {
    return c.json({ error: '发送失败', detail: String(err) }, 500)
  }
})

app.post('/topic/:topicId/reply', async c => {
  try {
    const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
    const base = getBase(isChina)
    const token = (c.req.header('Authorization') || '').replace('Bearer ', '')
    if (!token) return c.json({ error: '未登录' }, 401)
    const { content } = await c.req.json()
    if (!content) return c.json({ error: '内容不能为空' }, 400)
    if (content.length > MAX_CONTENT_LENGTH)
      return c.json({ data: null, error: '内容过长', code: 400 }, 400)

    const topicId = c.req.param('topicId')
    const pageHtml = await fetchHTML(`${base}/subject/topic/${topicId}`, {
      headers: { Authorization: `Bearer ${token}`, Cookie: `chii_auth=${token}` }
    })
    const formhash = extractFormhash(pageHtml)
    if (!formhash) return c.json({ error: '无法获取表单 token，请重新登录' }, 400)

    const cookie = extractChiiAuth(token)
    const params = new URLSearchParams()
    params.append('formhash', formhash)
    params.append('content', content)
    params.append('submit', 'submit')

    const res = await fetch(`${base}/subject/topic/${topicId}/new_reply`, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookie,
        Referer: `${base}/subject/topic/${topicId}`
      },
      body: params.toString(),
      redirect: 'manual'
    })

    if (res.status >= 300 && res.status < 400) return c.json({ success: true })
    if (res.ok) return c.json({ success: true })
    const body = await res.text()
    return c.json({ error: '发送失败', detail: body.slice(0, 200) }, 400)
  } catch (err) {
    return c.json({ error: '发送失败', detail: String(err) }, 500)
  }
})

app.post('/subject/:id/talkbox', async c => {
  try {
    const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
    const base = getBase(isChina)
    const token = (c.req.header('Authorization') || '').replace('Bearer ', '')
    if (!token) return c.json({ error: '未登录' }, 401)
    const { content } = await c.req.json()
    if (!content) return c.json({ error: '内容不能为空' }, 400)
    if (content.length > MAX_CONTENT_LENGTH)
      return c.json({ data: null, error: '内容过长', code: 400 }, 400)

    const subjectId = c.req.param('id')
    const pageHtml = await fetchHTML(`${base}/subject/${subjectId}/talkbox`, {
      headers: { Authorization: `Bearer ${token}`, Cookie: `chii_auth=${token}` }
    })
    const formhash = extractFormhash(pageHtml)
    if (!formhash) return c.json({ error: '无法获取表单 token，请重新登录' }, 400)

    const cookie = extractChiiAuth(token)
    const params = new URLSearchParams()
    params.append('formhash', formhash)
    params.append('content', content)
    params.append('submit', 'submit')

    const res = await fetch(`${base}/subject/${subjectId}/talkbox`, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookie,
        Referer: `${base}/subject/${subjectId}/talkbox`
      },
      body: params.toString(),
      redirect: 'manual'
    })

    if (res.status >= 300 && res.status < 400) return c.json({ success: true })
    if (res.ok) return c.json({ success: true })
    const body = await res.text()
    return c.json({ error: '发送失败', detail: body.slice(0, 200) }, 400)
  } catch (err) {
    return c.json({ error: '发送失败', detail: String(err) }, 500)
  }
})

app.post('/subject/:id/topic', async c => {
  try {
    const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
    const base = getBase(isChina)
    const token = (c.req.header('Authorization') || '').replace('Bearer ', '')
    if (!token) return c.json({ error: '未登录' }, 401)
    const { title, content } = await c.req.json()
    if (!title) return c.json({ error: '标题不能为空' }, 400)
    if (!content) return c.json({ error: '内容不能为空' }, 400)
    if (title.length > MAX_TITLE_LENGTH)
      return c.json({ data: null, error: '标题过长', code: 400 }, 400)
    if (content.length > MAX_CONTENT_LENGTH)
      return c.json({ data: null, error: '内容过长', code: 400 }, 400)

    const subjectId = c.req.param('id')
    const pageHtml = await fetchHTML(`${base}/subject/${subjectId}/board`, {
      headers: { Authorization: `Bearer ${token}`, Cookie: `chii_auth=${token}` }
    })
    const formhash = extractFormhash(pageHtml)
    if (!formhash) return c.json({ error: '无法获取表单 token，请重新登录' }, 400)

    const cookie = extractChiiAuth(token)
    const params = new URLSearchParams()
    params.append('formhash', formhash)
    params.append('title', title)
    params.append('content', content)
    params.append('submit', 'submit')

    const res = await fetch(`${base}/subject/${subjectId}/board/new`, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookie,
        Referer: `${base}/subject/${subjectId}/board`
      },
      body: params.toString(),
      redirect: 'manual'
    })

    if (res.status >= 300 && res.status < 400) return c.json({ success: true })
    if (res.ok) return c.json({ success: true })
    const body = await res.text()
    return c.json({ error: '发送失败', detail: body.slice(0, 200) }, 400)
  } catch (err) {
    return c.json({ error: '发送失败', detail: String(err) }, 500)
  }
})

export default app
