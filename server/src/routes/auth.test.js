import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../middleware/jwtAuth.js', () => ({
  jwtAuth: () => async (c, next) => {
    c.set('user', { userId: 'current-user' })
    await next()
  }
}))

vi.mock('../services/auth.js', () => ({
  registerUser: vi.fn(),
  loginUser: vi.fn(),
  bindBangumi: vi.fn(),
  unbindBangumi: vi.fn(),
  refreshJwt: vi.fn(),
  getCurrentUser: vi.fn(),
  sendVerificationCode: vi.fn(),
  getUserBgmToken: vi.fn(),
  createOAuthBindState: vi.fn(),
  verifyOAuthBindState: vi.fn(),
  bindBangumiByOAuth: vi.fn(),
  changeUserPassword: vi.fn(),
  resetUserPassword: vi.fn()
}))

vi.mock('../utils/oauthConfig.js', () => ({
  getOAuthCredentials: vi.fn(() => ({ appId: 'test-app', appSecret: 'test-secret' }))
}))

import app from './auth.js'
import { verifyOAuthBindState, bindBangumiByOAuth } from '../services/auth.js'

const env = { DB: {}, JWT_SECRET: 'test-secret-at-least-32-characters-long' }

describe('POST /oauth-bind-callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  it('拒绝 state 所属 Bangmio 用户与当前会话不一致的回调', async () => {
    verifyOAuthBindState.mockResolvedValue({ valid: true, userId: 'another-user' })

    const res = await app.request(
      '/oauth-bind-callback',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'authorization-code', state: 'signed-state' })
      },
      env
    )
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: expect.stringContaining('当前账号') })
    expect(bindBangumiByOAuth).not.toHaveBeenCalled()
  })

  it('只将已验证且属于当前会话的 state 交给绑定服务', async () => {
    verifyOAuthBindState.mockResolvedValue({ valid: true, userId: 'current-user' })
    bindBangumiByOAuth.mockResolvedValue({
      token: 'new-jwt',
      user: { id: 'current-user', bgmUid: '12345' },
      bgmToken: 'bgm-token'
    })

    const res = await app.request(
      '/oauth-bind-callback',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'authorization-code', state: 'signed-state' })
      },
      env
    )
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      data: { token: 'new-jwt', user: { bgmUid: '12345' }, bgmToken: 'bgm-token' }
    })
    expect(bindBangumiByOAuth).toHaveBeenCalledWith(
      env.DB,
      env,
      expect.objectContaining({ code: 'authorization-code', state: 'signed-state' })
    )
  })
})
