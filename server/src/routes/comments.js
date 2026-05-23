import { Router } from 'express'
import axios from 'axios'
import * as cheerio from 'cheerio'

const router = Router()

const cache = new Map()
const CACHE_TTL = 5 * 60 * 1000

async function fetchHTML(url) {
  const { data } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'zh-CN,zh;q=0.9'
    },
    responseType: 'arraybuffer',
    timeout: 15000
  })
  return new TextDecoder('utf-8').decode(data)
}

function parseUserLink($el) {
  const link = $el.find('strong > a[href^="/user/"], strong.userName > a[href^="/user/"]')
  const avatarEl = $el.find('.avatarNeue')
  const avatarStyle = avatarEl.attr('style') || ''
  const avatarMatch = avatarStyle.match(/url\(['"]?([^'"()]+)['"]?\)/)
  const avatar = avatarMatch ? (avatarMatch[1].startsWith('//') ? 'https:' + avatarMatch[1] : avatarMatch[1]) : ''
  return {
    username: link.text().trim(),
    url: link.attr('href') || '',
    avatar
  }
}

function parseSubReplies($, $el) {
  const replies = []
  $el.find('.topic_sub_reply .sub_reply_bg').each((j, subEl) => {
    const $sub = $(subEl)
    const floorEl = $sub.find('.floor-anchor')
    const floor = floorEl.text().replace('#', '').trim()
    const actionText = floorEl.parent().text()
    const timestamp = actionText.replace(/#[\d-]+[\s-]*/, '').trim()
    const user = parseUserLink($sub)
    const content = $sub.find('.cmt_sub_content').text().trim()

    if (user.username && content) {
      replies.push({
        id: $sub.attr('id')?.replace('post_', '') || String(j),
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
  const $ = cheerio.load(html)
  const comments = []

  $('#comment_list > .row_reply').each((i, el) => {
    const $el = $(el)
    const floorEl = $el.find('> .post_actions .floor-anchor')
    const floor = floorEl.text().replace('#', '').trim()
    const actionText = floorEl.parent().text()
    const timestamp = actionText.replace(/#\S+\s*-?\s*/, '').trim()
    const user = parseUserLink($el)
    const content = $el.find('> .inner .message, > .inner .reply_content .message').text().trim()
    const replies = parseSubReplies($, $el)

    if (user.username && content) {
      comments.push({
        id: $el.attr('id')?.replace('post_', '') || String(i),
        floor,
        user,
        content,
        timestamp,
        replies
      })
    }
  })

  return comments.slice(0, 50)
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
    const starEl = $el.find('.starlight')
    const starClass = starEl.attr('class') || ''
    const starMatch = starClass.match(/stars(\d+)/)
    const rating = starMatch ? parseInt(starMatch[1]) : 0
    const timeEl = $el.find('small.grey')
    const timestamp = timeEl.last().text().trim().replace(/^@\s*/, '')
    const content = $el.find('p.comment').text().trim()

    if (userLink.length) {
      comments.push({
        id: String(i),
        user: {
          username: userLink.text().trim(),
          url: userLink.attr('href') || '',
          avatar
        },
        rating,
        content: content || '(无文字评价)',
        timestamp
      })
    }
  })

  return comments.slice(0, 50)
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
    const repliesText = $el.find('td:nth-child(3) small.grey').text().trim()
    const repliesMatch = repliesText.match(/(\d+)/)
    const dateText = $el.find('td:nth-child(4) small.grey').text().trim()

    topics.push({
      id: href.split('/').pop(),
      title,
      href: `https://bgm.tv${href}`,
      author: authorLink.text().trim(),
      replies: repliesMatch ? parseInt(repliesMatch[1]) : 0,
      date: dateText
    })
  })

  return topics
}

function parseTopicPage(html) {
  const $ = cheerio.load(html)

  const $op = $('.postTopic')
  const opUser = parseUserLink($op)
  const opContent = $op.find('.topic_content').text().trim()
  const opTimeEl = $op.find('.post_actions .action small')
  const opTimestamp = opTimeEl.text().replace(/#\d+\s*-?\s*/, '').trim()

  const titleEl = $('h1.nameSingle a, .headerNeueInner h1, title')
  const title = titleEl.first().text().trim()

  const op = {
    user: opUser,
    content: opContent,
    timestamp: opTimestamp,
    title
  }

  const replies = []
  $('#comment_list > .row_reply').each((i, el) => {
    const $el = $(el)
    const floorEl = $el.find('> .post_actions .floor-anchor')
    const floor = floorEl.text().replace('#', '').trim()
    const actionText = floorEl.parent().text()
    const timestamp = actionText.replace(/#\S+\s*-?\s*/, '').trim()
    const user = parseUserLink($el)
    const content = $el.find('.message').text().trim()
    const subReplies = parseSubReplies($, $el)

    if (user.username && content) {
      replies.push({
        id: $el.attr('id')?.replace('post_', '') || String(i),
        floor,
        user,
        content,
        timestamp,
        replies: subReplies
      })
    }
  })

  return { op, replies: replies.slice(0, 100) }
}

function getCached(key) {
  const c = cache.get(key)
  if (c && Date.now() - c.time < CACHE_TTL) return c.data
  return null
}

function setCache(key, data) {
  cache.set(key, { data, time: Date.now() })
}

router.get('/character/:id', async (req, res) => {
  try {
    const key = `char_${req.params.id}`
    const cached = getCached(key)
    if (cached) return res.json({ data: cached })

    const html = await fetchHTML(`https://bgm.tv/character/${req.params.id}`)
    const comments = parseTalkbox(html)
    setCache(key, comments)
    res.json({ data: comments })
  } catch (err) {
    console.error('Scrape character talkbox error:', err.message)
    res.status(500).json({ error: '获取评论失败' })
  }
})

router.get('/subject/:id', async (req, res) => {
  try {
    const key = `subj_${req.params.id}`
    const cached = getCached(key)
    if (cached) return res.json({ data: cached })

    const html = await fetchHTML(`https://bgm.tv/subject/${req.params.id}`)
    const comments = parseSubjectTalkbox(html)
    setCache(key, comments)
    res.json({ data: comments })
  } catch (err) {
    console.error('Scrape subject talkbox error:', err.message)
    res.status(500).json({ error: '获取评论失败' })
  }
})

router.get('/subject/:id/topics', async (req, res) => {
  try {
    const key = `topics_${req.params.id}`
    const cached = getCached(key)
    if (cached) return res.json({ data: cached })

    const html = await fetchHTML(`https://bgm.tv/subject/${req.params.id}/board`)
    const topics = parseTopics(html)
    setCache(key, topics)
    res.json({ data: topics })
  } catch (err) {
    console.error('Scrape subject topics error:', err.message)
    res.status(500).json({ error: '获取讨论版失败' })
  }
})

router.get('/topic/:topicId', async (req, res) => {
  try {
    const key = `topic_${req.params.topicId}`
    const cached = getCached(key)
    if (cached) return res.json({ data: cached })

    const html = await fetchHTML(`https://bgm.tv/subject/topic/${req.params.topicId}`)
    const topic = parseTopicPage(html)
    setCache(key, topic)
    res.json({ data: topic })
  } catch (err) {
    console.error('Scrape topic error:', err.message)
    res.status(500).json({ error: '获取帖子内容失败' })
  }
})

router.get('/person/:id', async (req, res) => {
  try {
    const key = `person_${req.params.id}`
    const cached = getCached(key)
    if (cached) return res.json({ data: cached })

    const html = await fetchHTML(`https://bgm.tv/person/${req.params.id}`)
    const comments = parseTalkbox(html)
    setCache(key, comments)
    res.json({ data: comments })
  } catch (err) {
    console.error('Scrape person talkbox error:', err.message)
    res.status(500).json({ error: '获取评论失败' })
  }
})

export default router
