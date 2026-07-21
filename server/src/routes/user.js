import { Hono } from 'hono'
import { getClient } from '../services/bangumi.js'
import { fetchHTML, stripTags, unescapeHtml, parseNumber, fixUrl } from '../utils/http.js'

const app = new Hono()

const DEFAULT_APP_ID = 'bgm61416a088eff71580'
const DEFAULT_APP_SECRET = '6b8055c0159fcc5e998059536813026f'

function isChina(c) {
  return (c.env?.CF_IP_COUNTRY || '') === 'CN'
}

function redirectUri(c) {
  return c.env?.OAUTH_REDIRECT_URI || 'http://localhost:5173/login/callback'
}

function oauthBase(c) {
  return isChina(c) ? 'https://bangumi.lol' : 'https://bgm.tv'
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const TIMELINE_TYPE_MAP = {
  collection: '收藏',
  wish: '想看',
  do: '在看',
  doing: '在看',
  on_hold: '搁置',
  dropped: '抛弃',
  progress: '进度',
  comment: '评论',
  create: '创建',
  blog: '日志',
  group_topic: '小组话题',
  status: '签名',
  mono: '人物',
  subject: '条目',
  index: '目录'
}

app.post('/auth', async c => {
  try {
    const { token } = await c.req.json()
    if (!token) return c.json({ error: '请输入 Access Token' }, 400)
    const client = getClient(token, isChina(c))
    const user = await client.get('/v0/me')
    return c.json({ data: { user, token } })
  } catch (err) {
    if (err.response?.status === 401) return c.json({ error: 'Token 无效，请检查' }, 401)
    return c.json({ error: '验证失败' }, 500)
  }
})

app.get('/oauth-url', c => {
  const appId = c.env?.BGM_APP_ID || DEFAULT_APP_ID
  const url = `${oauthBase(c)}/oauth/authorize?client_id=${appId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri(c))}`
  return c.json({ data: url })
})

app.post('/oauth-callback', async c => {
  try {
    const { code } = await c.req.json()
    if (!code) return c.json({ error: '缺少授权码' }, 400)
    const appId = c.env?.BGM_APP_ID || DEFAULT_APP_ID
    const appSecret = c.env?.BGM_APP_SECRET || DEFAULT_APP_SECRET
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: appId,
      client_secret: appSecret,
      code,
      redirect_uri: redirectUri(c)
    })
    const tokenRes = await fetch(`${oauthBase(c)}/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    })
    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token
    const refreshToken = tokenData.refresh_token
    if (!accessToken) return c.json({ error: '获取 Token 失败', detail: tokenData }, 400)
    const client = getClient(accessToken, isChina(c))
    const user = await client.get('/v0/me')
    return c.json({ data: { user, token: accessToken, refreshToken: refreshToken || '' } })
  } catch (err) {
    return c.json({ error: '授权失败，请确保回调地址已在 bgm.tv/dev/app 设置' }, 500)
  }
})

app.post('/refresh-token', async c => {
  try {
    const { refreshToken } = await c.req.json()
    if (!refreshToken) return c.json({ error: '缺少 refresh token' }, 400)
    const appId = c.env?.BGM_APP_ID || DEFAULT_APP_ID
    const appSecret = c.env?.BGM_APP_SECRET || DEFAULT_APP_SECRET
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: appId,
      client_secret: appSecret,
      refresh_token: refreshToken,
      redirect_uri: redirectUri(c)
    })
    const tokenRes = await fetch(`${oauthBase(c)}/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    })
    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token
    const newRefreshToken = tokenData.refresh_token || refreshToken
    if (!accessToken) return c.json({ error: '刷新 Token 失败' }, 400)
    const client = getClient(accessToken, isChina(c))
    const user = await client.get('/v0/me')
    return c.json({ data: { user, token: accessToken, refreshToken: newRefreshToken } })
  } catch (err) {
    return c.json({ error: '刷新失败，请重新登录' }, 500)
  }
})

app.get('/me', async c => {
  try {
    const token = (c.req.header('Authorization') || '').replace('Bearer ', '')
    if (!token) return c.json({ error: '未登录' }, 401)
    const client = getClient(token, isChina(c))
    const user = await client.get('/v0/me')
    return c.json({ data: user })
  } catch (err) {
    return c.json({ error: '登录过期' }, 401)
  }
})

app.get('/:username/characters', async c => {
  try {
    const username = c.req.param('username')
    if (!username) return c.json({ error: '缺少用户名' }, 400)
    const token = (c.req.header('Authorization') || '').replace('Bearer ', '')
    const client = token ? getClient(token, isChina(c)) : getClient('', isChina(c))
    const data = await client.get(`/v0/users/${username}/characters`, { limit: 10 })
    return c.json({ data: data.data || [] })
  } catch {
    return c.json({ data: [] })
  }
})

app.get('/:username/persons', async c => {
  try {
    const username = c.req.param('username')
    if (!username) return c.json({ error: '缺少用户名' }, 400)
    const token = (c.req.header('Authorization') || '').replace('Bearer ', '')
    const client = token ? getClient(token, isChina(c)) : getClient('', isChina(c))
    const data = await client.get(`/v0/users/${username}/persons`, { limit: 10 })
    return c.json({ data: data.data || [] })
  } catch {
    return c.json({ data: [] })
  }
})

app.get('/:username/indexes', async c => {
  try {
    const username = c.req.param('username')
    if (!username) return c.json({ error: '缺少用户名' }, 400)
    const token = (c.req.header('Authorization') || '').replace('Bearer ', '')
    const client = token ? getClient(token, isChina(c)) : getClient('', isChina(c))
    // Bangumi v0 API 可能没有 /indexes，尝试调用，失败返回空数组
    const data = await client.get(`/v0/users/${username}/indexes`)
    return c.json({ data: data.data || [] })
  } catch {
    return c.json({ data: [] })
  }
})

app.get('/:username/friends', async c => {
  try {
    const username = c.req.param('username')
    if (!username) return c.json({ data: [] })
    const base = oauthBase(c)
    const html = await fetchHTML(`${base}/user/${username}/friends`)
    if (!html) return c.json({ data: [] })

    const friends = []
    const seen = new Set()
    // 按 <li 分割，每个好友块含 /user/{username} 链接 + avatar/sign
    const chunks = html.split(/<li\b/i)
    for (const chunk of chunks) {
      const linkMatch = chunk.match(/href="\/user\/([^"/?#]+)"/i)
      if (!linkMatch) continue
      const uname = linkMatch[1]
      if (uname === username || seen.has(uname)) continue
      seen.add(uname)

      // 昵称：取链接文本
      const nameRe = new RegExp(`href="/user/${escapeRegex(uname)}"[^>]*>([\\s\\S]*?)<\\/a>`, 'i')
      const nameMatch = chunk.match(nameRe)
      const nickname = nameMatch ? unescapeHtml(stripTags(nameMatch[1])) : uname

      // 头像
      const avatarMatch = chunk.match(/<img[^>]*src="([^"]+)"/i)
      const avatar = avatarMatch ? fixUrl(avatarMatch[1], base) : ''

      // 签名
      const signMatch =
        chunk.match(/<p[^>]*class="[^"]*sign[^"]*"[^>]*>([\s\S]*?)<\/p>/i) ||
        chunk.match(/class="sign"[^>]*>([\s\S]*?)<\//i)
      const sign = signMatch ? unescapeHtml(stripTags(signMatch[1])) : ''

      friends.push({ username: uname, nickname, avatar, sign })
      if (friends.length >= 30) break
    }

    return c.json({ data: friends })
  } catch {
    return c.json({ data: [] })
  }
})

app.get('/:username/groups', async c => {
  try {
    const username = c.req.param('username')
    if (!username) return c.json({ data: [] })
    const base = oauthBase(c)
    const html = await fetchHTML(`${base}/user/${username}/group`)
    if (!html) return c.json({ data: [] })

    // 优先从 #group 或 .groups 区块提取，避免全页导航链接受污染
    let scope = html
    const blockMatch =
      html.match(/id="group"[\s\S]*?<ul[\s\S]*?<\/ul>/i) ||
      html.match(/class="[^"]*groups[^"]*"[\s\S]*?<ul[\s\S]*?<\/ul>/i) ||
      html.match(/<h2[^>]*>小组[\s\S]*?<ul[\s\S]*?<\/ul>/i)
    if (blockMatch) scope = blockMatch[0]

    const groups = []
    const seen = new Set()
    const linkRegex = /<a href="\/group\/([^"/]+)"[^>]*>([\s\S]*?)<\/a>/gi
    let m
    while ((m = linkRegex.exec(scope)) !== null) {
      const id = m[1]
      if (seen.has(id)) continue
      const name = unescapeHtml(stripTags(m[2])).trim()
      if (!name || /^\d+$/.test(name)) continue
      seen.add(id)

      const idx = m.index
      const context = scope.slice(Math.max(0, idx - 250), Math.min(scope.length, idx + 500))

      const memberMatch =
        context.match(/([0-9]+)\s*成员/i) ||
        context.match(/<span class="group_member">([0-9]+).*?<\/span>/i) ||
        context.match(/<span class="l">([0-9]+).*?<\/span>/i) ||
        context.match(/<strong>([0-9]+)<\/strong>/i)
      const member_count = memberMatch ? parseNumber(memberMatch[1]) : 0

      const avatarMatch = context.match(/<img[^>]*src="([^"]+)"[^>]*>/i)
      const avatar = avatarMatch ? fixUrl(avatarMatch[1], base) : ''

      groups.push({ id, name, avatar, member_count })
      if (groups.length >= 30) break
    }

    return c.json({ data: groups })
  } catch {
    return c.json({ data: [] })
  }
})

app.get('/:username/timeline', async c => {
  try {
    const username = c.req.param('username')
    if (!username) return c.json({ data: [] })
    const base = oauthBase(c)
    const html = await fetchHTML(`${base}/user/${username}/timeline`)
    if (!html) return c.json({ data: [] })

    const items = []
    // 时间线项在 class 含 tml-item 的 li/div 中
    const chunks = html.split(/(?=<li[^>]*class="[^"]*tml-item)|(?=<div[^>]*class="[^"]*tml-item)/i)
    for (const chunk of chunks) {
      if (!/tml-item/i.test(chunk)) continue

      // 类型：从 tml-xxx class 提取并映射
      const typeMatch =
        chunk.match(/class="[^"]*tml-item\s+tml-(\w+)/i) || chunk.match(/class="[^"]*tml-(\w+)/i)
      const rawType = typeMatch ? typeMatch[1] : 'unknown'
      const type = TIMELINE_TYPE_MAP[rawType] || rawType

      // subject 链接
      const subMatch = chunk.match(/href="\/subject\/(\d+)"[^>]*>([^<]+)<\/a>/i)
      const subject_id = subMatch ? subMatch[1] : ''
      const subject_name = subMatch ? unescapeHtml(subMatch[2].trim()) : ''

      // 动作文本：提取内容中的纯文本
      const contentMatch =
        chunk.match(/<div[^>]*class="[^"]*tml-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
        chunk.match(/<p[^>]*class="[^"]*tml-content[^"]*"[^>]*>([\s\S]*?)<\/p>/i) ||
        chunk.match(/<p[^>]*>([\s\S]*?)<\/p>/i)
      let action = ''
      if (contentMatch) {
        action = contentMatch[1]
          .replace(/<a[^>]*>[\s\S]*?<\/a>/gi, '')
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim()
      }

      // 时间
      const timeMatch =
        chunk.match(/class="[^"]*tml-time[^"]*"[^>]*>([^<]+)<\//i) ||
        chunk.match(/class="[^"]*time[^"]*"[^>]*>([^<]+)<\//i)
      const time = timeMatch ? unescapeHtml(stripTags(timeMatch[1])) : ''

      items.push({ type, subject_id, subject_name, action, time })
      if (items.length >= 20) break
    }

    return c.json({ data: items })
  } catch {
    return c.json({ data: [] })
  }
})

app.get('/:username/stats-yearly', async c => {
  try {
    const username = c.req.param('username')
    if (!username) return c.json({ data: [] })
    const base = oauthBase(c)
    const html = await fetchHTML(`${base}/user/${username}`)
    if (!html) return c.json({ data: [] })

    const stats = []
    const seenYears = new Set()

    // 方法1：尝试从 <script> 内嵌 JSON 提取 chart 数据
    const scriptChartMatch = html.match(/(?:yearlyChart|charts|chartData)\s*=\s*(\[[\s\S]*?\]);/i)
    if (scriptChartMatch) {
      try {
        const data = JSON.parse(scriptChartMatch[1])
        for (const item of data) {
          if (item && item.year && !seenYears.has(item.year)) {
            seenYears.add(item.year)
            stats.push({
              year: parseInt(item.year),
              want: item.want || item.wish || 0,
              collect: item.collect || 0,
              doing: item.do || item.doing || 0,
              on_hold: item.on_hold || item.onhold || 0,
              dropped: item.dropped || item.drop || 0
            })
          }
        }
      } catch {
        /* 忽略 JSON 解析失败 */
      }
    }

    // 方法2：查找 data-year 属性
    if (!stats.length) {
      const dataYearRegex =
        /data-year="(\d{4})"[^>]*\sdata-(?:want|wish)="(\d*)"[^>]*\sdata-collect="(\d*)"[^>]*\sdata-doing="(\d*)"[^>]*\sdata-on_hold="(\d*)"[^>]*\sdata-dropped="(\d*)"/gi
      let dym
      while ((dym = dataYearRegex.exec(html)) !== null) {
        const year = parseInt(dym[1])
        if (!seenYears.has(year)) {
          seenYears.add(year)
          stats.push({
            year,
            want: parseNumber(dym[2]),
            collect: parseNumber(dym[3]),
            doing: parseNumber(dym[4]),
            on_hold: parseNumber(dym[5]),
            dropped: parseNumber(dym[6])
          })
        }
      }
    }

    // 方法3：解析 /user/{username}/list/{year} 链接附近的数字
    if (!stats.length) {
      const yearRegex =
        /href="\/user\/[^"]+\/(?:list|anime-list)\/(\d{4})[^"]*"[^>]*>([\s\S]{0,300}?)<\/a>/gi
      let ym
      while ((ym = yearRegex.exec(html)) !== null) {
        const year = parseInt(ym[1])
        if (seenYears.has(year)) continue
        const content = ym[2]
        const nums = content.match(/(\d+)/g) || []
        if (nums.length > 0) {
          seenYears.add(year)
          stats.push({
            year,
            want: parseInt(nums[0]) || 0,
            collect: parseInt(nums[1]) || 0,
            doing: parseInt(nums[2]) || 0,
            on_hold: parseInt(nums[3]) || 0,
            dropped: parseInt(nums[4]) || 0
          })
        }
      }
    }

    // 方法4：查找 chart 元素中年份和数字
    if (!stats.length) {
      // 匹配 <span class="year">2024</span> ... <span class="num">12</span>
      const chartRegex =
        /class="[^"]*year[^"]*"[^>]*>\s*(\d{4})\s*<[\s\S]{0,200}?class="[^"]*(?:num|count|rate)[^"]*"[^>]*>\s*(\d+)/gi
      let cm
      while ((cm = chartRegex.exec(html)) !== null) {
        const year = parseInt(cm[1])
        if (year >= 2000 && year <= 2030 && !seenYears.has(year)) {
          seenYears.add(year)
          stats.push({
            year,
            want: 0,
            collect: parseInt(cm[2]) || 0,
            doing: 0,
            on_hold: 0,
            dropped: 0
          })
        }
      }
    }

    // 方法5：查找 "2024 年" + 数字的通用模式
    if (!stats.length) {
      const yearStatRegex = /(\d{4})\s*年[\s\S]{0,80}?(\d+)\s*(?:部|个|条)/gi
      let ysm
      while ((ysm = yearStatRegex.exec(html)) !== null) {
        const year = parseInt(ysm[1])
        if (year >= 2000 && year <= 2030 && !seenYears.has(year)) {
          seenYears.add(year)
          stats.push({
            year,
            want: 0,
            collect: parseInt(ysm[2]) || 0,
            doing: 0,
            on_hold: 0,
            dropped: 0
          })
        }
      }
    }

    return c.json({ data: stats })
  } catch {
    return c.json({ data: [] })
  }
})

app.get('/:username', async c => {
  try {
    const username = c.req.param('username')
    if (!username) return c.json({ error: '缺少用户名' }, 400)
    const token = (c.req.header('Authorization') || '').replace('Bearer ', '')
    const client = token ? getClient(token, isChina(c)) : getClient('', isChina(c))
    const user = await client.get(`/v0/users/${username}`)
    return c.json({ data: user })
  } catch {
    return c.json({ data: null })
  }
})

export default app
