import { Router } from 'express'
import { getClient } from '../services/bangumi.js'
import axios from 'axios'

const router = Router()

const APP_ID = 'bgm61416a088eff71580'
const APP_SECRET = '6b8055c0159fcc5e998059536813026f'
const REDIRECT_URI = 'http://localhost:5173/login/callback'

router.post('/auth', async (req, res) => {
  try {
    const { token } = req.body
    if (!token) return res.status(400).json({ error: '请输入 Access Token' })

    const client = getClient(token)
    const { data: user } = await client.get('/v0/me')
    res.json({ data: { user, token } })
  } catch (err) {
    if (err.response?.status === 401) {
      return res.status(401).json({ error: 'Token 无效，请检查' })
    }
    res.status(500).json({ error: '验证失败' })
  }
})

router.get('/oauth-url', (req, res) => {
  const url = `https://bgm.tv/oauth/authorize?client_id=${APP_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`
  res.json({ data: url })
})

router.post('/oauth-callback', async (req, res) => {
  try {
    const { code } = req.body
    if (!code) return res.status(400).json({ error: '缺少授权码' })

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: APP_ID,
      client_secret: APP_SECRET,
      code,
      redirect_uri: REDIRECT_URI
    })
    const tokenRes = await axios.post('https://bgm.tv/oauth/access_token', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000
    })
    console.log('OAuth token response:', JSON.stringify(tokenRes.data))

    const accessToken = tokenRes.data.access_token
    const refreshToken = tokenRes.data.refresh_token
    if (!accessToken) {
      return res.status(400).json({ error: '获取 Token 失败', detail: tokenRes.data })
    }

    const client = getClient(accessToken)
    const { data: user } = await client.get('/v0/me')
    res.json({ data: { user, token: accessToken, refreshToken: refreshToken || '' } })
  } catch (err) {
    console.error('OAuth callback error:', err.response?.data || err.message)
    res.status(500).json({ error: '授权失败，请确保回调地址已在 bgm.tv/dev/app 设置' })
  }
})

router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) return res.status(400).json({ error: '缺少 refresh token' })

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: APP_ID,
      client_secret: APP_SECRET,
      refresh_token: refreshToken,
      redirect_uri: REDIRECT_URI
    })
    const tokenRes = await axios.post('https://bgm.tv/oauth/access_token', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000
    })

    const accessToken = tokenRes.data.access_token
    const newRefreshToken = tokenRes.data.refresh_token || refreshToken
    if (!accessToken) {
      return res.status(400).json({ error: '刷新 Token 失败' })
    }

    const client = getClient(accessToken)
    const { data: user } = await client.get('/v0/me')
    res.json({ data: { user, token: accessToken, refreshToken: newRefreshToken } })
  } catch (err) {
    console.error('Refresh token error:', err.message)
    res.status(500).json({ error: '刷新失败，请重新登录' })
  }
})

router.get('/me', async (req, res) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: '未登录' })

    const client = getClient(token)
    const { data: user } = await client.get('/v0/me')
    res.json({ data: user })
  } catch (err) {
    res.status(401).json({ error: '登录过期' })
  }
})

export default router
