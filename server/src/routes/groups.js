import { Hono } from 'hono'
import { parseHTML } from 'linkedom'
import { createCache } from '../utils/cache.js'
import { fetchHTML, fetchHTMLMulti, parseNumber, fixUrl, repairMojibake } from '../utils/http.js'
import { CACHE_TTL_GROUPS } from '../config.js'

const app = new Hono()

const HOSTS = {
  main: 'https://bgm.tv',
  mirror1: 'https://bangumi.pro',
  mirror2: 'https://bangumi.one'
}

const cache = createCache(CACHE_TTL_GROUPS)

// 永不过期的「最近一次成功」缓存，仅在抓取失败时回退使用
const lastSuccessStore = new Map()
const lastSuccessTopicStore = new Map()

function getBaseUrls(isChina) {
  // 国内节点优先走代理镜像，海外节点优先走官方
  if (isChina) {
    return [HOSTS.mirror1, HOSTS.mirror2, HOSTS.main]
  }
  return [HOSTS.main, HOSTS.mirror1, HOSTS.mirror2]
}

/** 上游 WAF 拦截页特征（命中则不写入边缘缓存，避免缓存降级内容） */
function looksBlocked(html) {
  return /Just a moment|Attention Required|403 Forbidden|Access denied|请求过于频繁/i.test(
    (html || '').slice(0, 2000)
  )
}

/**
 * 抓取小组页面 HTML，优先 Cloudflare Cache API（PROJECT_ISSUES 6.3）。
 *
 * - Cache API 在 CF 边缘跨实例共享，解决了原内存 Map 缓存命中率低的问题；
 * - 按 URL 逐个查缓存（命中即返回），未命中再走多源并发抓取并回写缓存（1 小时 TTL）；
 * - WAF 拦截页不写入缓存；非 CF 环境（本地 node）自动降级为直接抓取。
 *
 * @param {string[]} urls 候选源 URL 列表（按优先级排序）
 * @returns {Promise<{ html: string, url: string, fromCache: boolean }>}
 */
async function fetchGroupHTMLCached(urls) {
  const cache = typeof caches !== 'undefined' ? caches.default : null

  if (cache) {
    for (const url of urls) {
      try {
        const cached = await cache.match(url)
        if (cached) {
          const html = repairMojibake(await cached.text())
          if (html && html.length >= 500) return { html, url, fromCache: true }
        }
      } catch {
        // 单个源缓存读取失败，继续尝试下一个源
      }
    }
  }

  const { html, url } = await fetchHTMLMulti(urls)

  if (cache && html && html.length >= 500 && !looksBlocked(html)) {
    try {
      await cache.put(
        url,
        new Response(html, {
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'max-age=3600' }
        })
      )
    } catch {
      // 缓存写入失败不影响主流程
    }
  }

  return { html, url, fromCache: false }
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

/**
 * 从锚点 href 中提取小组 id。
 * 兼容相对路径（/group/xxx）、绝对路径（https://bgm.tv/group/xxx）与带查询串的链接。
 * @param {string} href
 * @returns {string | null}
 */
function groupIdFromHref(href) {
  const m = String(href || '').match(/(?:^|[/])group\/([^/?#]+)/)
  if (!m) return null
  try {
    return decodeURIComponent(m[1])
  } catch {
    return m[1]
  }
}

/**
 * 折叠空白并去除首尾空格（等价于原 unescapeHtml 的空白折叠，DOM textContent 已解码实体）。
 * @param {string} str
 * @returns {string}
 */
function collapseText(str) {
  return repairMojibake(String(str || ''))
    .replace(/\s+/g, ' ')
    .trim()
}

const GENERIC_PROFILE_NAMES = new Set([
  '社区成员',
  '社区用户',
  '用户',
  '匿名用户',
  '匿名',
  'unknown',
  'user'
])

function isGenericProfileName(value) {
  return GENERIC_PROFILE_NAMES.has(collapseText(value).toLocaleLowerCase())
}

function contentText(element, base = HOSTS.main) {
  if (!element) return ''
  const clone = element.cloneNode(true)
  // 保留段落/列表/引用等块级元素的边界，避免上游 HTML 的多段正文被拼成一行。
  for (const block of clone.querySelectorAll?.(
    'p, div, section, article, li, blockquote, pre, h1, h2, h3, h4, h5, h6'
  ) || []) {
    block.before('\n')
    block.after('\n')
  }
  for (const br of clone.querySelectorAll?.('br') || []) br.replaceWith('\n')
  for (const anchor of clone.querySelectorAll?.('a[href]') || []) {
    const label = collapseText(anchor.textContent)
    const rawHref = anchor.getAttribute('href') || ''
    let href = ''
    try {
      const resolved = new URL(rawHref, base)
      if (resolved.protocol === 'http:' || resolved.protocol === 'https:') href = resolved.href
    } catch {
      // Ignore malformed or unsafe links and retain their visible label.
    }
    if (href && label && !label.includes(href)) anchor.replaceWith('[' + label + '](' + href + ')')
  }
  return repairMojibake(String(clone.textContent || ''))
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function safeAbsoluteUrl(rawHref, base) {
  try {
    const resolved = new URL(String(rawHref || ''), base)
    return resolved.protocol === 'http:' || resolved.protocol === 'https:' ? resolved.href : ''
  } catch {
    return ''
  }
}

function profileFrom(container, base) {
  const anchors = Array.from(container?.querySelectorAll?.('a[href*="/user/"]') || [])
  const candidates = anchors.map((anchor, index) => {
    const href = anchor.getAttribute('href') || ''
    let username = href.match(/\/user\/([^/?#]+)/)?.[1] || ''
    try {
      username = decodeURIComponent(username)
    } catch {
      /* keep the raw segment */
    }
    return { anchor, href, username, label: collapseText(anchor.textContent || ''), index }
  })
  const named =
    candidates
      .filter(candidate => candidate.label || candidate.username)
      .sort((left, right) => {
        const score = candidate =>
          (candidate.label && !isGenericProfileName(candidate.label) ? 8 : 0) +
          (candidate.username && !isGenericProfileName(candidate.username) ? 5 : 0)
        return score(right) - score(left) || left.index - right.index
      })[0] || candidates[0]
  const href = named?.href || ''
  const username =
    named?.username ||
    named?.label ||
    collapseText(container?.getAttribute?.('data-item-user') || '')
  const avatarElements = Array.from(
    container?.querySelectorAll?.('.avatarNeue, .avatar, [style*="background-image"], img[src]') ||
      []
  )
  const avatarEl =
    avatarElements.find(
      element => element.tagName?.toLowerCase() === 'img' && element.getAttribute('src')
    ) || avatarElements.find(element => /url\(/i.test(element.getAttribute?.('style') || ''))
  const style = avatarEl?.getAttribute?.('style') || ''
  const styleMatch = style.match(/url\(['"]?([^'"()]+)['"]?\)/)
  const rawAvatar =
    avatarEl?.tagName?.toLowerCase() === 'img' ? avatarEl.getAttribute('src') : styleMatch?.[1]
  const avatar = rawAvatar ? fixUrl(rawAvatar, base) : ''
  const rawLabel = named?.label || ''
  const nickname =
    rawLabel && !isGenericProfileName(rawLabel)
      ? rawLabel
      : !isGenericProfileName(username)
        ? username
        : rawLabel || username
  return { username, nickname, avatar, url: href ? fixUrl(href, base) : '' }
}

function formhashFrom(html) {
  const inputs = String(html || '').match(/<input\b[^>]*>/gi) || []
  for (const input of inputs) {
    const name = input.match(/\bname\s*=\s*["']formhash["']/i)
    const value = input.match(/\bvalue\s*=\s*["']([^"']+)["']/i)?.[1]
    if (name && value) return value
  }
  return null
}

function chiiCookie(token) {
  return 'chii_auth=' + token + '; chii_cookietime=2592000'
}

async function submitGroupForm({ base, path, submitPath = path, token, fields }) {
  const pageHtml = await fetchHTML(base + path, {
    headers: { Authorization: 'Bearer ' + token, Cookie: 'chii_auth=' + token }
  })
  const formhash = formhashFrom(pageHtml)
  if (!formhash) throw new Error('无法获取表单 token，请重新登录')
  const params = new URLSearchParams({ formhash, ...fields, submit: 'submit' })
  const response = await fetch(base + submitPath, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: chiiCookie(token),
      Referer: base + path
    },
    body: params.toString(),
    redirect: 'manual'
  })
  const body = await response.text().catch(() => '')
  const location = response.headers.get('location') || ''
  if (!groupSubmissionAccepted(response, body, location))
    throw new Error('发送失败，请确认登录状态和内容后重试')
  return true
}

function groupReplySubmissionPath(topicId) {
  return '/group/topic/' + encodeURIComponent(String(topicId)) + '/new_reply'
}

function submissionFailure(body) {
  return /(?:登录失败|登陆失败|验证码|权限不足|禁止发言|请先登录|formhash.{0,30}(?:错误|无效|过期)|发送失败|提交失败|错误\s*[:：])/i.test(
    String(body || '')
  )
}

function groupSubmissionAccepted(response, body, location) {
  const status = Number(response?.status || 0)
  const redirect = String(location || '')
  if (status >= 300 && status < 400) {
    return (
      Boolean(redirect) &&
      !/(?:login|signin|auth|captcha)/i.test(redirect) &&
      /\/group(?:\/topic)?\//i.test(redirect)
    )
  }
  if (!response?.ok || submissionFailure(body)) return false
  return /(?:发表成功|发布成功|提交成功|发送成功|回复成功|话题成功|操作成功|已发布|已成功)/i.test(
    String(body || '')
  )
}
function parseGroupListHTML(html, base) {
  const groups = []
  const seen = new Set()

  const { document } = parseHTML(html)

  for (const anchor of document.querySelectorAll('a[href]')) {
    const id = collapseText(groupIdFromHref(anchor.getAttribute('href')))
    if (!id) continue

    // 过滤非小组链接
    if (/\.(jpg|png|gif|jpeg|webp)$/i.test(id)) continue
    if (/^\d+$/.test(id)) continue
    if (id === 'new_topic' || id.startsWith('topic')) continue
    if (id === 'discover' || id === 'all' || id === 'category') continue

    // 名称：锚点的纯文本（img 的 alt 等不参与）
    const name = collapseText(anchor.textContent)
    if (!name || /^\d+$/.test(name)) continue

    // 成员数：在锚点所在容器（通常是 li/行）内查找 "NNN 位成员"；
    // 孤儿节点回退到锚点后的兄弟元素文本
    let member_count = null
    let containerText = anchor.parentElement?.textContent || ''
    if (!containerText) {
      let sib = anchor.nextElementSibling
      while (sib && containerText.length < 200) {
        containerText += ' ' + (sib.textContent || '')
        sib = sib.nextElementSibling
      }
    }
    const memberMatch = containerText.match(/([0-9][0-9,]*)\s*(?:位成员|成员|members?)/i)
    if (memberMatch) {
      member_count = parseNumber(memberMatch[1])
    }

    // 头像：锚点内 img 优先，其次容器内 img
    let avatar = ''
    const img = anchor.querySelector('img[src]') || anchor.parentElement?.querySelector('img[src]')
    if (img) {
      avatar = fixUrl(img.getAttribute('src'), base)
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

/**
 * 查找 class 名包含指定子串的第一个元素。
 * @param {Document} document
 * @param {string} substr
 * @returns {Element | null}
 */
function firstByClassSubstring(document, substr) {
  for (const el of document.querySelectorAll('[class]')) {
    if ((el.getAttribute('class') || '').includes(substr)) return el
  }
  return null
}

function parseGroupDetailHTML(html, id, base) {
  const { document } = parseHTML(html)

  // 名称：第一个 h1 的纯文本，缺失时回退为 id
  const h1 = document.querySelector('h1')
  const name = h1 ? collapseText(h1.textContent) : ''
  const finalName = name || id

  // 简介：class 含 group_desc / text / intro 的 div，或 class 含 tip 的 p（保持原顺序）
  let description = ''
  for (const pattern of ['group_desc', 'text', 'intro', 'tip']) {
    const el = firstByClassSubstring(document, pattern)
    const text = el ? collapseText(el.textContent) : ''
    if (text) {
      description = contentText(el, base)
      break
    }
  }

  // 成员数：兼容 Bangumi 新旧页面的文字、class、data 属性和 aria-label。
  // 个人小组页只提供小组链接时，前端会再从小组详情接口补齐这个字段。
  let member_count = parseMemberCount(document)

  // 头像：h1 附近（向上最多 4 层容器内）第一个 img
  let avatar = ''
  let node = h1?.parentElement || null
  for (let i = 0; i < 4 && node; i++) {
    const img = node.querySelector('img[src]')
    if (img) {
      avatar = fixUrl(img.getAttribute('src'), base)
      break
    }
    node = node.parentElement
  }

  // 话题：仅在 .topic_list 表格内解析（无该表格时回退到含 /group/topic/ 链接的表格）
  const topics = []
  const seenTopics = new Set()
  let table = null
  for (const t of document.querySelectorAll('table')) {
    if ((t.getAttribute('class') || '').includes('topic_list')) {
      table = t
      break
    }
  }
  if (!table) {
    for (const t of document.querySelectorAll('table')) {
      if (t.querySelector('a[href*="/group/topic/"]')) {
        table = t
        break
      }
    }
  }
  if (table) {
    for (const anchor of table.querySelectorAll('a[href]')) {
      const topicMatch = (anchor.getAttribute('href') || '').match(/\/group\/topic\/(\d+)/)
      if (!topicMatch) continue
      const topicId = topicMatch[1]
      if (seenTopics.has(topicId)) continue
      seenTopics.add(topicId)

      const title = collapseText(anchor.textContent)
      if (!title) continue

      const row = anchor.closest('tr') || anchor.parentElement
      const rowText = row?.textContent || ''

      const profile = profileFrom(row, base)
      const author = profile.nickname

      // 回复数：td.posts / class 含 posts 的元素，回退 "(N 回复)" / "N 回复"
      let reply_count = null
      const postsEl = row?.querySelector('td.posts, [class*="posts"]')
      if (postsEl && /\d/.test(postsEl.textContent || '')) {
        reply_count = parseNumber(postsEl.textContent)
      }
      if (reply_count === null) {
        const replyMatch =
          rowText.match(/\((\d+)\s*(?:回复|reply|条)/i) || rowText.match(/(\d+)\s*(?:回复|reply)/i)
        if (replyMatch) reply_count = parseNumber(replyMatch[1])
      }

      // 最后回复时间：small.time / span.date / span.time / small，排除成员数类文本
      let last_reply_time = ''
      const timeEl = row?.querySelector('small.time, span.date, span.time, small')
      if (timeEl) {
        const timeText = collapseText(timeEl.textContent)
        if (!/^\d+\s*(?:位成员|成员|members?)$/.test(timeText)) {
          last_reply_time = timeText
        }
      }

      topics.push({
        id: topicId,
        title,
        author,
        username: profile.username,
        nickname: profile.nickname,
        avatar: profile.avatar,
        creator: profile,
        user: profile,
        reply_count,
        last_reply_time
      })
      if (topics.length >= 20) break
    }
  }

  const topicCountCandidates = [
    ...Array.from(document.querySelectorAll('[data-topic-count], [data-topics-count]')).map(
      el => el.getAttribute('data-topic-count') || el.getAttribute('data-topics-count') || ''
    ),
    ...Array.from(document.querySelectorAll('[class]'))
      .filter(el => /topic[_-]?count/i.test(el.getAttribute('class') || ''))
      .map(el => el.textContent || ''),
    document.body?.textContent || ''
  ]
  const topicCountText = topicCountCandidates.find(text => /(?:话题|topics?)/i.test(text)) || ''
  const topicCountMatch =
    topicCountText.match(/([0-9][0-9,]*)\s*(?:个?话题|topics?)/i) ||
    topicCountText.match(/(?:话题|topics?)\s*[:：]?\s*([0-9][0-9,]*)/i)
  const topic_count = topicCountMatch ? parseNumber(topicCountMatch[1]) : null

  return {
    id,
    name: finalName,
    description,
    member_count,
    topic_count,
    avatar,
    topics,
    url: `${base}/group/${id}`
  }
}

/**
 * 从 Bangumi 小组页面提取成员数。不同镜像/页面版本的标记不完全一致，
 * 不能只依赖“位成员”这一个文案，否则个人小组页会全部退化成 0。
 * @param {Document} document
 * @returns {number | null}
 */
function parseMemberCount(document) {
  const candidates = []
  for (const el of document.querySelectorAll(
    '[data-member-count], [data-members], [aria-label*="成员"], [title*="成员"]'
  )) {
    const directCount = el.getAttribute('data-member-count') || el.getAttribute('data-members')
    if (directCount && parseNumber(directCount) > 0) return parseNumber(directCount)
    candidates.push(
      el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || ''
    )
  }
  candidates.push(document.body?.textContent || '')
  for (const el of document.querySelectorAll('[class]')) {
    const className = el.getAttribute('class') || ''
    if (/(?:group[_-]?member|member[_-]?count|subscribers?|members?)/i.test(className)) {
      const directText = collapseText(el.textContent)
      if (/^[0-9][0-9,]*$/.test(directText)) return parseNumber(directText)
      candidates.push(directText)
    }
  }

  for (const text of candidates) {
    const normalized = collapseText(text)
    const match =
      normalized.match(/([0-9][0-9,]*)\s*(?:位?成员|人|members?|subscribers?)/i) ||
      normalized.match(/(?:成员(?:数|人数)?|members?|subscribers?)\s*[:：]?\s*([0-9][0-9,]*)/i)
    if (match) {
      const count = parseNumber(match[1])
      if (count > 0) return count
    }
  }

  for (const el of document.querySelectorAll('strong, em, b, span')) {
    const value = collapseText(el.textContent)
    if (!/^[0-9][0-9,]*$/.test(value)) continue
    const context = collapseText(el.parentElement?.textContent || '')
    if (/(?:成员|members?|subscribers?)/i.test(context)) return parseNumber(value)
  }
  return null
}

/**
 * 解析小组帖子详情，供 Bangmio 内部页面展示，不把用户送回 Bangumi。
 * @param {string} html
 * @param {string} id
 * @param {string} base
 * @returns {object}
 */
function fallbackGroupTopic(id, base, content = '暂时无法加载该话题正文，请稍后刷新。') {
  return {
    id,
    title: '话题 #' + id,
    group_id: '',
    group_name: '',
    author: '',
    username: '',
    nickname: '',
    avatar: '',
    creator: { username: '', nickname: '', avatar: '', url: '' },
    content,
    reply_count: null,
    main_post: null,
    replies: [],
    url: base + '/group/topic/' + id
  }
}
function parseGroupTopicHTML(html, id, base) {
  const { document } = parseHTML(html)
  const titleEl = document.querySelector('h1, h2.topic_title, .topic_title, .topicTitle')

  // Bangumi may put the group breadcrumb and topic title in the same heading.
  // Strip only the linked group breadcrumb; keep the actual title text intact.
  const isGroupAnchor = anchor => {
    const href = safeAbsoluteUrl(anchor.getAttribute('href') || '', base)
    const groupId = groupIdFromHref(href)
    const reservedPaths = new Set(['discover', 'all', 'category', 'new_topic'])
    return (
      Boolean(groupId) &&
      !reservedPaths.has(groupId.toLowerCase()) &&
      !/\/group\/topic\//.test(href)
    )
  }
  const groupAnchor =
    Array.from(titleEl?.querySelectorAll('a[href]') || []).find(isGroupAnchor) ||
    Array.from(document.querySelectorAll('a[href]')).find(isGroupAnchor)
  const titleClone = titleEl?.cloneNode(true)
  for (const anchor of titleClone?.querySelectorAll?.('a[href]') || []) {
    if (isGroupAnchor(anchor)) anchor.remove()
  }
  const title =
    collapseText(titleClone?.textContent || titleEl?.textContent || '').replace(
      /^[\s»›|/:：-]+/,
      ''
    ) || '话题 #' + id

  const authorLinks = Array.from(document.querySelectorAll('a[href*="/user/"]'))
  const rows = []
  const seen = new Set()

  const authorFrom = container => profileFrom(container, base)

  const appendRow = (container, fallbackFloor) => {
    const profile = authorFrom(container)
    const author = profile.nickname || container.getAttribute('data-item-user') || ''
    const contentEl =
      container.querySelector('.topic_content > .message') ||
      container.querySelector('.reply_content > .message') ||
      container.querySelector('.topic_content') ||
      container.querySelector('.reply_content') ||
      container.querySelector('.cmt_sub_content, .sub_reply_content, .message, .content, p')
    const content = contentText(contentEl, base)
    if (!author || !content) return false

    const postId = (container.getAttribute('id') || '').match(/^post_(\d+)/i)?.[1]
    const floorAnchor = container.querySelector(
      '.floor-anchor, .floor, .reply_floor, [class*="floor"]'
    )
    const floorText = collapseText(floorAnchor?.textContent || '').replace(/^#/, '')
    const floor = /^\d+$/.test(floorText) ? parseNumber(floorText) : floorText || fallbackFloor
    const key = `${postId || author}:${floor}:${content}`
    if (seen.has(key)) return false
    seen.add(key)

    const timeEl = container.querySelector(
      '.post_actions.re_info small, time, .time, .reply_time, .date, small'
    )
    const timestamp = collapseText(timeEl?.textContent || '').replace(/^#[^\s]+\s*-?\s*/, '')
    rows.push({
      id: postId ? `${id}-${postId}` : `${id}-${floor}`,
      floor,
      author,
      username: profile.username,
      nickname: profile.nickname,
      avatar: profile.avatar,
      creator: profile,
      user: profile,
      content,
      timestamp
    })
    return true
  }

  // 当前 Bangumi 页面：首帖为 .postTopic，一级回复为 #comment_list > .row_reply，
  // 楼中楼为 .topic_sub_reply > .sub_reply_bg。仅解析这些实际帖子容器，避免把
  // .reply_content 和空白头像链接当成一条回复，从而显示为“匿名用户”。
  const mainPost = document.querySelector('.postTopic[id^="post_"]')
  const mainPostRow = mainPost && appendRow(mainPost, 1) ? rows[0] : null

  const replyContainers = Array.from(document.querySelectorAll('#comment_list > .row_reply'))
  if (!replyContainers.length) {
    replyContainers.push(...document.querySelectorAll('.row_reply, .topic-reply, .reply'))
  }
  for (const container of replyContainers) {
    appendRow(container, rows.length + 1)
    for (const subReply of container.querySelectorAll('.topic_sub_reply > .sub_reply_bg')) {
      appendRow(subReply, rows.length + 1)
      if (rows.length >= 50) break
    }
    if (rows.length >= 50) break
  }

  if (!rows.length) {
    // 兼容旧镜像：只在标准帖子容器完全不存在时才使用保守回退。
    for (const user of authorLinks) {
      const author = collapseText(user.textContent)
      if (!author) continue
      let container = user.parentElement
      for (let i = 0; i < 4 && container; i++, container = container.parentElement) {
        const text = collapseText(container.textContent)
        if (text.length < 8) continue
        const content = text.replace(author, '').trim()
        if (content.length < 2) continue
        rows.push({
          id: `${id}-${rows.length + 1}`,
          floor: String(rows.length + 1),
          author,
          content: content.slice(0, 2000),
          timestamp: ''
        })
        break
      }
      if (rows.length >= 50) break
    }
  }

  const bodyText = collapseText(document.body?.textContent || html || '')
  const replyMatch = bodyText.match(/([0-9][0-9,]*)\s*(?:回复|repl(?:y|ies))/i)
  return {
    id,
    title,
    group_id: groupAnchor ? groupIdFromHref(groupAnchor.getAttribute('href')) || '' : '',
    group_name: groupAnchor ? collapseText(groupAnchor.textContent) : '',
    author:
      rows[0]?.author ||
      authorLinks.map(link => collapseText(link.textContent)).find(Boolean) ||
      '',
    username: rows[0]?.username || '',
    nickname: rows[0]?.nickname || rows[0]?.author || '',
    avatar: rows[0]?.avatar || '',
    creator: rows[0]?.creator || { username: '', nickname: '', avatar: '', url: '' },
    reply_count: replyMatch
      ? Math.max(rows.length - 1, parseNumber(replyMatch[1]))
      : rows.length > 1
        ? rows.length - 1
        : null,
    // Additive field: legacy consumers still receive the original replies array.
    main_post: mainPostRow,
    replies: rows,
    url: base + '/group/topic/' + id
  }
}
/**
 * 解析 Bangumi「随便看看」页面中的全站热门/最新话题。
 * 页面结构以 table.topic_list 为主，兼容镜像站当前使用的 class 与相对链接。
 * @param {string} html
 * @param {string} base
 * @returns {Array<object>}
 */
function parseGroupDiscoverHTML(html, base) {
  const { document } = parseHTML(html)
  const topics = []
  const seen = new Set()
  const table = document.querySelector('table.topic_list')
  if (!table) return topics

  for (const row of table.querySelectorAll('tr')) {
    const topicAnchor = Array.from(row.querySelectorAll('a[href]')).find(anchor =>
      /\/group\/topic\/[^/?#]+/.test(anchor.getAttribute('href') || '')
    )
    if (!topicAnchor) continue

    const topicMatch = (topicAnchor.getAttribute('href') || '').match(/\/group\/topic\/([^/?#]+)/)
    if (!topicMatch) continue
    let id
    try {
      id = decodeURIComponent(topicMatch[1])
    } catch {
      // A malformed upstream link is not a usable topic id; skip only this row.
      continue
    }
    if (seen.has(id)) continue
    seen.add(id)

    const groupAnchor = Array.from(row.querySelectorAll('a[href]')).find(anchor => {
      const href = safeAbsoluteUrl(anchor.getAttribute('href') || '', base)
      return /(?:^|\/)group\/[^/?#]+/.test(href) && !/\/group\/topic\//.test(href)
    })
    const authorAnchor = Array.from(row.querySelectorAll('a[href]')).find(anchor =>
      /(?:^|\/)user\/[^/?#]+/.test(anchor.getAttribute('href') || '')
    )
    const authorProfile = authorAnchor
      ? profileFrom(row, base)
      : { username: '', nickname: '', avatar: '', url: '' }

    const rowText = collapseText(row.textContent)
    const replyMatch = rowText.match(/\(\s*\+?([0-9][0-9,]*)\s*\)/)
    const dateMatch = rowText.match(/\b\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:\s+\d{1,2}:\d{2})?\b/)
    const groupId = groupAnchor ? groupIdFromHref(groupAnchor.getAttribute('href')) : ''
    const title = collapseText(topicAnchor.textContent)
    if (!title) continue

    topics.push({
      id,
      title,
      group_id: groupId || '',
      group_name: groupAnchor ? collapseText(groupAnchor.textContent) : '',
      author:
        authorProfile.nickname || (authorAnchor ? collapseText(authorAnchor.textContent) : ''),
      username: authorProfile.username,
      nickname: authorProfile.nickname,
      avatar: authorProfile.avatar,
      creator: authorProfile,
      user: authorProfile,
      reply_count: replyMatch ? parseNumber(replyMatch[1]) : null,
      last_reply_time: dateMatch ? dateMatch[0] : '',
      url: `${base}/group/topic/${id}`
    })

    if (topics.length >= 30) break
  }

  // 源站按时间展示；这里按回复数优先，保证“热门帖子”而不是随机小组列表。
  return topics.sort((a, b) => Number(b.reply_count ?? -1) - Number(a.reply_count ?? -1))
}
// 导出解析函数供单元测试使用（fixture 驱动，不依赖上游网络）
export {
  parseGroupListHTML,
  parseGroupDetailHTML,
  parseGroupDiscoverHTML,
  parseGroupTopicHTML,
  formhashFrom,
  groupSubmissionAccepted,
  submissionFailure,
  groupReplySubmissionPath
}

// GET /groups - 小组列表
app.get('/', async c => {
  try {
    const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
    const cacheKey = `groups_list_${isChina ? 'cn' : 'global'}`
    const cached = cache.get(cacheKey)
    if (cached) return c.json({ data: cached.data, degraded: cached.degraded === true })

    const bases = getBaseUrls(isChina)
    const urls = bases.map(base => `${base}/group/all`)

    let groups = []
    let baseUrl = bases[0]
    let degraded = false
    try {
      const { html, url } = await fetchGroupHTMLCached(urls)
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
      degraded = true
    }

    cache.set(cacheKey, { data: groups, degraded })
    return c.json({ data: groups, degraded })
  } catch {
    return c.json({
      data: FALLBACK_GROUPS.map(g => ({ ...g, url: `${HOSTS.main}/group/${g.id}` })),
      degraded: true
    })
  }
})

// GET /groups/topic/:id - 小组帖子详情（由 Bangmio 代理展示）
app.get('/topic/:id', async c => {
  try {
    const id = c.req.param('id')
    if (!id || !/^\d+$/.test(id)) return c.json({ data: null, degraded: true }, 400)
    const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
    const cacheKey = 'groups_topic_' + id + '_' + (isChina ? 'cn' : 'global')
    const cached = cache.get(cacheKey)
    if (cached) return c.json({ data: cached.data, degraded: cached.degraded === true })
    const bases = getBaseUrls(isChina)
    const urls = bases.map(base => base + '/group/topic/' + id)
    try {
      const { html, url } = await fetchGroupHTMLCached(urls)
      const baseUrl = url.replace(/\/group\/topic\/[^/]+\/?$/, '') || bases[0]
      const topic = parseGroupTopicHTML(html, id, baseUrl)
      const degraded = topic.title === '话题 #' + id && topic.replies.length === 0
      lastSuccessTopicStore.set(id, topic)
      cache.set(cacheKey, { data: topic, degraded })
      return c.json({ data: topic, degraded })
    } catch {
      const lastSuccess = lastSuccessTopicStore.get(id)
      if (lastSuccess) return c.json({ data: lastSuccess, degraded: true })
      return c.json({ data: fallbackGroupTopic(id, bases[0]), degraded: true })
    }
  } catch {
    return c.json({ data: null, degraded: true })
  }
})
// GET /groups/discover - 全站热门帖子
app.get('/discover', async c => {
  try {
    const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
    const cacheKey = `groups_discover_${isChina ? 'cn' : 'global'}`
    const cached = cache.get(cacheKey)
    if (cached) return c.json({ data: cached.data, degraded: cached.degraded === true })

    const bases = getBaseUrls(isChina)
    const urls = bases.map(base => `${base}/group/discover`)
    const { html, url } = await fetchGroupHTMLCached(urls)
    const baseUrl = url.replace(/\/group\/discover\/?$/, '') || bases[0]
    const topics = parseGroupDiscoverHTML(html, baseUrl)
    const degraded = topics.length === 0
    cache.set(cacheKey, { data: topics, degraded })
    return c.json({ data: topics, degraded })
  } catch {
    return c.json({ data: [], degraded: true })
  }
})
// GET /groups/search - 服务端搜索小组
app.get('/search', async c => {
  try {
    // 兼容 spec 的 q 参数与前端使用的 keyword 参数
    const keyword = (c.req.query('keyword') || c.req.query('q') || '').trim()
    if (!keyword) return c.json({ data: [], degraded: false })

    const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
    const cacheKey = `groups_search_${keyword}_${isChina ? 'cn' : 'global'}`
    const cached = cache.get(cacheKey)
    if (cached) return c.json({ data: cached.data, degraded: cached.degraded === true })

    const bases = getBaseUrls(isChina)
    const urls = bases.map(base => `${base}/group/all`)

    let groups = []
    let baseUrl = bases[0]
    let degraded = false
    try {
      const { html, url } = await fetchGroupHTMLCached(urls)
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
      degraded = true
    }

    const q = keyword.toLowerCase()
    const result = groups.filter(
      g =>
        (g.name || '').toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q)
    )

    cache.set(cacheKey, { data: result, degraded })
    return c.json({ data: result, degraded })
  } catch {
    return c.json({ data: [], degraded: true })
  }
})

// GET /groups/:id - 小组详情
app.get('/:id', async c => {
  try {
    const id = c.req.param('id')
    if (!id || id.length > 80 || /[\\/?#]/.test(id))
      return c.json({ data: null, error: '小组 ID 不合法', code: 400 }, 400)
    const isChina = (c.env?.CF_IP_COUNTRY || '') === 'CN'
    const cacheKey = `groups_detail_${id}_${isChina ? 'cn' : 'global'}`
    const cached = cache.get(cacheKey)
    if (cached) return c.json({ data: cached.data, degraded: cached.degraded === true })

    const bases = getBaseUrls(isChina)
    const urls = bases.map(base => `${base}/group/${id}`)

    try {
      const { html, url } = await fetchGroupHTMLCached(urls)
      const baseUrl =
        url.replace(new RegExp(`/group/${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$`), '') ||
        bases[0]
      let detail
      let degraded = false
      try {
        detail = parseGroupDetailHTML(html, id, baseUrl)
        // 占位数据：parseGroupDetailHTML 未能解析出真实小组名
        if (detail.name === id) degraded = true
      } catch {
        // 解析异常：构造带原站链接的兜底数据，避免 500
        const fallback = FALLBACK_GROUPS.find(g => g.id === id)
        detail = fallback
          ? { ...fallback, url: `${bases[0]}/group/${id}`, topics: [] }
          : {
              id,
              name: id,
              description: '',
              member_count: null,
              topic_count: null,
              avatar: '',
              url: `${bases[0]}/group/${id}`,
              topics: []
            }
        degraded = true
      }
      // 抓取成功：同时写入 TTL 缓存与「最近一次成功」长期缓存
      lastSuccessStore.set(id, detail)
      cache.set(cacheKey, { data: detail, degraded })
      return c.json({ data: detail, degraded })
    } catch {
      // 抓取失败：优先返回最近一次成功数据（如有）
      const lastSuccess = lastSuccessStore.get(id)
      if (lastSuccess) {
        // 命中最近成功缓存时，仍写入 TTL 缓存以减少上游压力
        cache.set(cacheKey, { data: lastSuccess, degraded: false })
        return c.json({ data: lastSuccess, degraded: false })
      }
      // 否则回退到 FALLBACK_GROUPS 中匹配项或基本占位
      const fallback = FALLBACK_GROUPS.find(g => g.id === id)
      const detail = fallback
        ? { ...fallback, url: `${bases[0]}/group/${id}`, topics: [] }
        : {
            id,
            name: id,
            description: '',
            member_count: null,
            topic_count: null,
            avatar: '',
            url: `${bases[0]}/group/${id}`,
            topics: []
          }
      cache.set(cacheKey, { data: detail, degraded: true })
      return c.json({ data: detail, degraded: true })
    }
  } catch {
    const id = c.req.param('id')
    return c.json({
      data: {
        id,
        name: id,
        description: '',
        member_count: null,
        topic_count: null,
        avatar: '',
        url: `${HOSTS.main}/group/${id}`,
        topics: []
      },
      degraded: true
    })
  }
})

app.post('/:id/topic', async c => {
  try {
    const groupId = c.req.param('id')
    if (!groupId || groupId.length > 80 || /[\\/?#]/.test(groupId))
      return c.json({ data: null, error: '小组 ID 不合法', code: 400 }, 400)
    const token = (c.req.header('Authorization') || '').replace(/^Bearer\s+/i, '').trim()
    if (!token) return c.json({ data: null, error: '未登录', code: 401 }, 401)
    const body = await c.req.json().catch(() => ({}))
    const title = String(body?.title || '').trim()
    const content = String(body?.content || '').trim()
    if (!title || !content)
      return c.json({ data: null, error: '标题和内容不能为空', code: 400 }, 400)
    if (title.length > 120 || content.length > 20000)
      return c.json({ data: null, error: '内容过长', code: 400 }, 400)
    const base = getBaseUrls((c.env?.CF_IP_COUNTRY || '') === 'CN')[0]
    await submitGroupForm({
      base,
      path: '/group/' + encodeURIComponent(groupId) + '/new_topic',
      token,
      fields: { title, content }
    })
    return c.json({ data: { success: true }, code: 200 })
  } catch (error) {
    return c.json(
      { data: null, error: error instanceof Error ? error.message : '发送失败', code: 400 },
      400
    )
  }
})

app.post('/topic/:topicId/reply', async c => {
  try {
    const topicId = c.req.param('topicId')
    if (!/^\d+$/.test(topicId) || !Number.isSafeInteger(Number(topicId)) || Number(topicId) <= 0)
      return c.json({ data: null, error: '话题 ID 不合法', code: 400 }, 400)
    const token = (c.req.header('Authorization') || '').replace(/^Bearer\s+/i, '').trim()
    if (!token) return c.json({ data: null, error: '未登录', code: 401 }, 401)
    const body = await c.req.json().catch(() => ({}))
    const content = String(body?.content || '').trim()
    if (!content) return c.json({ data: null, error: '内容不能为空', code: 400 }, 400)
    if (content.length > 20000) return c.json({ data: null, error: '内容过长', code: 400 }, 400)
    const base = getBaseUrls((c.env?.CF_IP_COUNTRY || '') === 'CN')[0]
    const path = '/group/topic/' + encodeURIComponent(topicId)
    await submitGroupForm({
      base,
      path,
      submitPath: groupReplySubmissionPath(topicId),
      token,
      fields: { content }
    })
    return c.json({ data: { success: true }, code: 200 })
  } catch (error) {
    return c.json(
      { data: null, error: error instanceof Error ? error.message : '发送失败', code: 400 },
      400
    )
  }
})
export default app
