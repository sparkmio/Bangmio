import { Hono } from 'hono'
import { getClient } from '../services/bangumi.js'

const app = new Hono()

const APP_ID = 'bgm61416a088eff71580'
const APP_SECRET = '6b8055c0159fcc5e998059536813026f'

function isChina(c) {
  return (c.env?.CF_IP_COUNTRY || '') === 'CN'
}

function redirectUri(c) {
  return c.env?.OAUTH_REDIRECT_URI || 'http://localhost:5173/login/callback'
}

function oauthBase(c) {
  return isChina(c) ? 'https://bangumi.lol' : 'https://bgm.tv'
}

app.post('/auth', async (c) => {
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

app.get('/oauth-url', (c) => {
  const url = `${oauthBase(c)}/oauth/authorize?client_id=${APP_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri(c))}`
  return c.json({ data: url })
})

app.post('/oauth-callback', async (c) => {
  try {
    const { code } = await c.req.json()
    if (!code) return c.json({ error: '缺少授权码' }, 400)
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: APP_ID,
      client_secret: APP_SECRET,
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

app.post('/refresh-token', async (c) => {
  try {
    const { refreshToken } = await c.req.json()
    if (!refreshToken) return c.json({ error: '缺少 refresh token' }, 400)
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: APP_ID,
      client_secret: APP_SECRET,
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

app.get('/me', async (c) => {
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

app.get('/:username/characters', async (c) => {
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

app.get('/:username/persons', async (c) => {
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

app.get('/:username/indexes', async (c) => {
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

app.get('/:username', async (c) => {
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
