const BGM_TV = 'https://bgm.tv'
const BGM_PROXY = 'https://bangumi.lol'

function getBase() {
  const mirror = localStorage.getItem('bangmio_mirror') || 'intl'
  return mirror === 'cn' ? BGM_PROXY : BGM_TV
}

function rewriteImg(url) {
  return url.replace(/lain\.bgm\.tv/g, 'lain.bangumi.lol')
}

export async function fetchHTML(path, token) {
  const base = getBase()
  const url = `${base}${path}`
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'zh-CN,zh;q=0.9'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
    headers['Cookie'] = `chii_auth=${token}`
  }

  try {
    const http = window.Capacitor?.Plugins?.Http
    if (http) {
      const res = await http.request({ url, method: 'GET', headers, responseType: 'text' })
      return res.data
    }
  } catch {}

  const res = await fetch(url, { headers })
  return await res.text()
}

function parseHTMLDoc(html) {
  const parser = new DOMParser()
  return parser.parseFromString(html, 'text/html')
}

function parseUserLink(el) {
  const link = el.querySelector('strong > a[href^="/user/"], strong.userName > a[href^="/user/"]')
  const avatarEl = el.querySelector('.avatarNeue')
  const avatarStyle = avatarEl ? (avatarEl.getAttribute('style') || '') : ''
  const avatarMatch = avatarStyle.match(/url\(['"]?([^'"()]+)['"]?\)/)
  let avatar = ''
  if (avatarMatch) {
    avatar = avatarMatch[1].startsWith('//') ? 'https:' + avatarMatch[1] : avatarMatch[1]
    avatar = rewriteImg(avatar)
  }
  return {
    username: link ? link.textContent.trim() : '',
    url: link ? link.getAttribute('href') || '' : '',
    avatar
  }
}

function parseSubReplies(doc, el) {
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

export function parseTalkbox(html) {
  const doc = parseHTMLDoc(html)
  const comments = []
  const rows = doc.querySelectorAll('#comment_list > .row_reply')
  rows.forEach((el, i) => {
    const floorEl = el.querySelector('.post_actions .floor-anchor')
    const floor = floorEl ? floorEl.textContent.replace('#', '').trim() : ''
    const actionText = floorEl ? floorEl.parentElement.textContent : ''
    const timestamp = actionText.replace(/#\S+\s*-?\s*/, '').trim()
    const user = parseUserLink(el)
    const contentEl = el.querySelector('.inner .message, .inner .reply_content .message')
    const content = contentEl ? contentEl.textContent.trim() : ''
    const replies = parseSubReplies(doc, el)
    if (user.username && content) {
      comments.push({ id: el.id?.replace('post_', '') || String(i), floor, user, content, timestamp, replies })
    }
  })
  return comments
}

export function parseSubjectTalkbox(html) {
  const doc = parseHTMLDoc(html)
  const comments = []
  const items = doc.querySelectorAll('#comment_box > .item')
  items.forEach((el, i) => {
    const userLink = el.querySelector('a.l[href^="/user/"]')
    if (!userLink) return
    const avatarEl = el.querySelector('.avatarNeue')
    const avatarStyle = avatarEl ? (avatarEl.getAttribute('style') || '') : ''
    const avatarMatch = avatarStyle.match(/url\(['"]?([^'"()]+)['"]?\)/)
    let avatar = ''
    if (avatarMatch) {
      avatar = avatarMatch[1].startsWith('//') ? 'https:' + avatarMatch[1] : avatarMatch[1]
      avatar = rewriteImg(avatar)
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

export function parseTopics(html) {
  const doc = parseHTMLDoc(html)
  const topics = []
  const rows = doc.querySelectorAll('table.topic_list tbody tr')
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

export function parseTopicPage(html) {
  const doc = parseHTMLDoc(html)

  const $op = doc.querySelector('.postTopic')
  const op = {
    user: $op ? parseUserLink($op) : { username: '', url: '', avatar: '' },
    content: $op ? ($op.querySelector('.topic_content') || { textContent: '' }).textContent.trim() : '',
    timestamp: $op ? ($op.querySelector('.post_actions .action small') || { textContent: '' }).textContent.replace(/#\d+\s*-?\s*/, '').trim() : '',
    title: (doc.querySelector('h1.nameSingle a, .headerNeueInner h1, title') || { textContent: '' }).textContent.trim()
  }

  const replies = []
  const replyRows = doc.querySelectorAll('#comment_list > .row_reply')
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
        replies: parseSubReplies(doc, el)
      })
    }
  })

  return { op, replies }
}

function extractFormhash(html) {
  const m = html.match(/name="formhash"\s+value="([^"]+)"/i)
  return m ? m[1] : null
}

export async function postComment(subjectId, content, token) {
  const base = getBase()
  const pageHtml = await fetchHTML(`/subject/${subjectId}/comments`, token)
  const formhash = extractFormhash(pageHtml)
  if (!formhash) throw new Error('无法获取表单 token')

  const cookie = `chii_auth=${token}; chii_cookietime=2592000`
  const params = new URLSearchParams()
  params.append('formhash', formhash)
  params.append('comment_content', content)
  params.append('submit', 'submit')

  const http = window.Capacitor?.Plugins?.Http
  if (http) {
    const res = await http.request({
      url: `${base}/subject/${subjectId}/comment`,
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookie },
      data: params.toString()
    })
    return res.status >= 200 && res.status < 400
  }

  const res = await fetch(`${base}/subject/${subjectId}/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookie },
    body: params.toString(),
    redirect: 'manual'
  })
  return res.status >= 300 && res.status < 400
}

export async function postReply(topicId, content, token) {
  const base = getBase()
  const pageHtml = await fetchHTML(`/subject/topic/${topicId}`, token)
  const formhash = extractFormhash(pageHtml)
  if (!formhash) throw new Error('无法获取表单 token')

  const cookie = `chii_auth=${token}; chii_cookietime=2592000`
  const params = new URLSearchParams()
  params.append('formhash', formhash)
  params.append('content', content)
  params.append('submit', 'submit')

  const http = window.Capacitor?.Plugins?.Http
  if (http) {
    const res = await http.request({
      url: `${base}/subject/topic/${topicId}/new_reply`,
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookie },
      data: params.toString()
    })
    return res.status >= 200 && res.status < 400
  }

  const res = await fetch(`${base}/subject/topic/${topicId}/new_reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookie },
    body: params.toString(),
    redirect: 'manual'
  })
  return res.status >= 300 && res.status < 400
}

export async function postTalkbox(subjectId, content, token) {
  const base = getBase()
  const pageHtml = await fetchHTML(`/subject/${subjectId}/talkbox`, token)
  const formhash = extractFormhash(pageHtml)
  if (!formhash) throw new Error('无法获取表单 token')

  const cookie = `chii_auth=${token}; chii_cookietime=2592000`
  const params = new URLSearchParams()
  params.append('formhash', formhash)
  params.append('content', content)
  params.append('submit', 'submit')

  const http = window.Capacitor?.Plugins?.Http
  if (http) {
    const res = await http.request({
      url: `${base}/subject/${subjectId}/talkbox`,
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookie },
      data: params.toString()
    })
    return res.status >= 200 && res.status < 400
  }

  const res = await fetch(`${base}/subject/${subjectId}/talkbox`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookie },
    body: params.toString(),
    redirect: 'manual'
  })
  return res.status >= 300 && res.status < 400
}

export async function postTopic(subjectId, title, content, token) {
  const base = getBase()
  const pageHtml = await fetchHTML(`/subject/${subjectId}/board`, token)
  const formhash = extractFormhash(pageHtml)
  if (!formhash) throw new Error('无法获取表单 token')

  const cookie = `chii_auth=${token}; chii_cookietime=2592000`
  const params = new URLSearchParams()
  params.append('formhash', formhash)
  params.append('title', title)
  params.append('content', content)
  params.append('submit', 'submit')

  const http = window.Capacitor?.Plugins?.Http
  if (http) {
    const res = await http.request({
      url: `${base}/subject/${subjectId}/board/new`,
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookie },
      data: params.toString()
    })
    return res.status >= 200 && res.status < 400
  }

  const res = await fetch(`${base}/subject/${subjectId}/board/new`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookie },
    body: params.toString(),
    redirect: 'manual'
  })
  return res.status >= 300 && res.status < 400
}
