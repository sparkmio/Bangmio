import { Hono } from 'hono'
import * as cheerio from 'cheerio'

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

function parseUserLink($el) {
  const link = $el.find('strong > a[href^="/user/"], strong.userName > a[href^="/user/"]')
  const avatarEl = $el.find('.avatarNeue')
  const avatarStyle = avatarEl.attr('style') || ''
  const avatarMatch = avatarStyle.match(/url\(['"]?([^'"()]+)['"]?\)/)
  const avatar = avatarMatch ? (avatarMatch[1].startsWith('//') ? 'https:' + avatarMatch[1] : avatarMatch[1]) : ''
  return { username: link.text().trim(), url: link.attr('href') || '', avatar }
}

function parseSubReplies($, $el) {
  const replies = []
  $el.find('.topic_sub_reply .sub_reply_bg').each((j, subEl) => {
    const $sub = $(subEl)
    const floor = $sub.find('.floor-anchor').text().replace('#', '').trim()
    const actionText = $sub.find('.floor-anchor').parent().text()
    const timestamp = actionText.replace(/#[\d-]+[\s-]*/, '').trim()
    const user = parseUserLink($sub)
    const content = $sub.find('.cmt_sub_content').text().trim()
    if (user.username && content) {
      replies.push({ id: $sub.attr('id')?.replace('post_', '') || String(j), floor, user, content, timestamp })
    }
  })
  return replies
}

function parseTalkbox(html) {
  const $ = cheerio.load(html)
  const comments = []
  $('#comment_list > .row_reply').each((i, el) => {
    const $el = $(el)
    const floor = $el.find('> .post_actions .floor-anchor').text().replace('#', '').trim()
    const actionText = $el.find('> .post_actions .floor-anchor').parent().text()
    const timestamp = actionText.replace(/#\S+\s*-?\s*/, '').trim()
    const user = parseUserLink($el)
    const content = $el.find('> .inner .message, > .inner .reply_content .message').text().trim()
    const replies = parseSubReplies($, $el)
    if (user.username && content) {
      comments.push({ id: $el.attr('id')?.replace('post_', '') || String(i), floor, user, content, timestamp, replies })
    }
  })
  return comments
}

function parseSubjectTalkbox(html) {
  const $ = cheerio.load(html)
  const comments = []
  $('#comment_box > .item').each((i, el) => {
    const $el = $(el)
    const userLink = $el.find('a.l[href^="/user/"]')
    const avatarEl = $el.find('.avatarNeue')
    const avatarStyle = avatarEl.attr('style') || ''
    const avatarMatch = avatarStyle.match(/url\(['"]?([^'"()]+)['"]?\)/)
    const avatar = avatarMatch ? (avatarMatch[1].startsWith('//') ? 'https:' + avatarMatch[1] : avatarMatch[1]) : ''
    const starMatch = ($el.find('.starlight').attr('class') || '').match(/stars(\d+)/)
    const timeEl = $el.find('small.grey')
    if (userLink.length) {
      comments.push({
        id: String(i),
        user: { username: userLink.text().trim(), url: userLink.attr('href') || '', avatar },
        rating: starMatch ? parseInt(starMatch[1]) : 0,
        content: $el.find('p.comment').text().trim() || '(无文字评价)',
        timestamp: timeEl.last().text().trim().replace(/^@\s*/, '')
      })
    }
  })
  return comments
}

function parseTopics(html) {
  const $ = cheerio.load(html)
  const topics = []
  $('table.topic_list tbody tr').each((i, el) => {
    const $el = $(el)
    const titleLink = $el.find('td.subject a')
    const href = titleLink.attr('href') || ''
    const title = titleLink.attr('title') || titleLink.text().trim()
    if (!href || !title) return
    const authorLink = $el.find('td:nth-child(2) a')
    const repliesMatch = $el.find('td:nth-child(3) small.grey').text().trim().match(/(\d+)/)
    const dateText = $el.find('td:nth-child(4) small.grey').text().trim()
    topics.push({ id: href.split('/').pop(), title, href: `https://bangumi.one${href}`, author: authorLink.text().trim(), replies: repliesMatch ? parseInt(repliesMatch[1]) : 0, date: dateText })
  })
  return topics
}

function parseTopicPage(html) {
  const $ = cheerio.load(html)
  const $op = $('.postTopic')
  const op = {
    user: parseUserLink($op),
    content: $op.find('.topic_content').text().trim(),
    timestamp: $op.find('.post_actions .action small').text().replace(/#\d+\s*-?\s*/, '').trim(),
    title: $('h1.nameSingle a, .headerNeueInner h1, title').first().text().trim()
  }
  const replies = []
  $('#comment_list > .row_reply').each((i, el) => {
    const $el = $(el)
    const floor = $el.find('> .post_actions .floor-anchor').text().replace('#', '').trim()
    const actionText = $el.find('> .post_actions .floor-anchor').parent().text()
    const timestamp = actionText.replace(/#\S+\s*-?\s*/, '').trim()
    const user = parseUserLink($el)
    const content = $el.find('.message').text().trim()
    if (user.username && content) {
      replies.push({ id: $el.attr('id')?.replace('post_', '') || String(i), floor, user, content, timestamp, replies: parseSubReplies($, $el) })
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

app.get('/character/:id', async (c) => {
  try {
    const key = `char_${c.req.param('id')}`
    const cached = getCached(key)
    if (cached) return c.json({ data: cached })
    const html = await fetchHTML(`https://bangumi.one/character/${c.req.param('id')}`)
    const comments = parseTalkbox(html)
    setCache(key, comments)
    return c.json({ data: comments })
  } catch (err) {
    return c.json({ error: '获取评论失败' }, 500)
  }
})

app.get('/subject/:id', async (c) => {
  try {
    const key = `subj_${c.req.param('id')}`
    const cached = getCached(key)
    if (cached) return c.json({ data: cached })
    const html = await fetchHTML(`https://bangumi.one/subject/${c.req.param('id')}`)
    const comments = parseSubjectTalkbox(html)
    setCache(key, comments)
    return c.json({ data: comments })
  } catch (err) {
    return c.json({ error: '获取评论失败' }, 500)
  }
})

app.get('/subject/:id/topics', async (c) => {
  try {
    const key = `topics_${c.req.param('id')}`
    const cached = getCached(key)
    if (cached) return c.json({ data: cached })
    const html = await fetchHTML(`https://bangumi.one/subject/${c.req.param('id')}/board`)
    const topics = parseTopics(html)
    setCache(key, topics)
    return c.json({ data: topics })
  } catch (err) {
    return c.json({ error: '获取讨论版失败' }, 500)
  }
})

app.get('/topic/:topicId', async (c) => {
  try {
    const key = `topic_${c.req.param('topicId')}`
    const cached = getCached(key)
    if (cached) return c.json({ data: cached })
    const html = await fetchHTML(`https://bangumi.one/subject/topic/${c.req.param('topicId')}`)
    const topic = parseTopicPage(html)
    setCache(key, topic)
    return c.json({ data: topic })
  } catch (err) {
    return c.json({ error: '获取帖子内容失败' }, 500)
  }
})

app.get('/person/:id', async (c) => {
  try {
    const key = `person_${c.req.param('id')}`
    const cached = getCached(key)
    if (cached) return c.json({ data: cached })
    const html = await fetchHTML(`https://bangumi.one/person/${c.req.param('id')}`)
    const comments = parseTalkbox(html)
    setCache(key, comments)
    return c.json({ data: comments })
  } catch (err) {
    return c.json({ error: '获取评论失败' }, 500)
  }
})

export default app
