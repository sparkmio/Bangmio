import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock users.js 全部函数
vi.mock('../db/users.js', () => ({
  createUser: vi.fn(),
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
  updateUserBgmBinding: vi.fn(),
  clearUserBgmBinding: vi.fn(),
  getUserBgmBinding: vi.fn(),
  userExistsByEmail: vi.fn()
}))

// Mock http.js 的 fetchHTML（bindBangumi 用它验证 Bangumi Token）
vi.mock('../utils/http.js', () => ({
  fetchHTML: vi.fn(),
  SCRAPE_UA: 'mock-ua'
}))

// 不 mock crypto.js 和 jwt.js（使用真实实现）
import {
  registerUser,
  loginUser,
  bindBangumi,
  refreshJwt,
  getCurrentUser,
  getUserBgmToken
} from './auth.js'
import {
  createUser,
  getUserByEmail,
  getUserById,
  updateUserBgmBinding,
  getUserBgmBinding,
  userExistsByEmail
} from '../db/users.js'
import { fetchHTML } from '../utils/http.js'
import { hashPassword, generateSalt, encryptToken } from '../utils/crypto.js'
import { signJwt, verifyJwt } from '../utils/jwt.js'

const ENV = {
  JWT_SECRET: 'test-secret-at-least-32-chars-long',
  BGMIO_SALT: 'test-salt'
}

// db 对象（因 users.js 全部被 mock，db 不会被实际使用）
const DB = {}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('registerUser', () => {
  it('邮箱已存在时抛 409 错误', async () => {
    userExistsByEmail.mockResolvedValue(true)

    await expect(
      registerUser(DB, ENV, { email: 'existing@test.com', password: 'pwd' })
    ).rejects.toMatchObject({ status: 409 })

    expect(createUser).not.toHaveBeenCalled()
  })

  it('新邮箱成功注册并返回有效 JWT 与 user', async () => {
    userExistsByEmail.mockResolvedValue(false)
    const createdUser = {
      id: 'new-user-id',
      email: 'new@test.com',
      bgmUid: null,
      createdAt: 1,
      updatedAt: 1
    }
    createUser.mockResolvedValue(createdUser)

    const { token, user } = await registerUser(DB, ENV, {
      email: 'new@test.com',
      password: 'pwd123'
    })

    // token 是有效 JWT
    const verified = await verifyJwt(token, ENV.JWT_SECRET)
    expect(verified.valid).toBe(true)
    expect(verified.payload.userId).toBe('new-user-id')
    expect(verified.payload.email).toBe('new@test.com')

    // user 对象
    expect(user).toEqual({ id: 'new-user-id', email: 'new@test.com', bgmUid: null })

    // createUser 被调用且参数正确
    expect(createUser).toHaveBeenCalledTimes(1)
    const [, input] = createUser.mock.calls[0]
    expect(input.email).toBe('new@test.com')
    expect(input.id).toBeTruthy()
    expect(input.salt).toMatch(/^[0-9a-f]{32}$/)
    expect(input.passwordHash).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('loginUser', () => {
  it('用户不存在时抛 401 错误', async () => {
    getUserByEmail.mockResolvedValue(null)

    await expect(
      loginUser(DB, ENV, { email: 'no@user.com', password: 'pwd' })
    ).rejects.toMatchObject({ status: 401 })
  })

  it('密码错误时抛 401 错误', async () => {
    const salt = generateSalt()
    const passwordHash = await hashPassword('correct-pwd', salt)
    getUserByEmail.mockResolvedValue({
      id: 'u1',
      email: 'a@b.c',
      salt,
      passwordHash,
      bgmUid: null
    })

    await expect(
      loginUser(DB, ENV, { email: 'a@b.c', password: 'wrong-pwd' })
    ).rejects.toMatchObject({ status: 401 })
  })

  it('正确密码成功登录返回 token 与 user', async () => {
    const salt = generateSalt()
    const passwordHash = await hashPassword('correct-pwd', salt)
    getUserByEmail.mockResolvedValue({
      id: 'u1',
      email: 'a@b.c',
      salt,
      passwordHash,
      bgmUid: '100'
    })

    const { token, user } = await loginUser(DB, ENV, {
      email: 'a@b.c',
      password: 'correct-pwd'
    })

    const verified = await verifyJwt(token, ENV.JWT_SECRET)
    expect(verified.valid).toBe(true)
    expect(verified.payload.userId).toBe('u1')
    expect(verified.payload.email).toBe('a@b.c')
    expect(verified.payload.bgmUid).toBe('100')

    expect(user).toEqual({ id: 'u1', email: 'a@b.c', bgmUid: '100' })
  })
})

describe('bindBangumi', () => {
  it('Bangumi API 验证成功时返回 token 与 user（含 bgmUid）', async () => {
    fetchHTML.mockResolvedValue(JSON.stringify({ id: 999, username: 'bgm-user' }))
    const updated = {
      id: 'u1',
      email: 'a@b.c',
      bgmUid: '999',
      createdAt: 1,
      updatedAt: 2
    }
    updateUserBgmBinding.mockResolvedValue(updated)

    const { token, user } = await bindBangumi(DB, ENV, 'u1', 'bgm-access-token')

    // fetchHTML 调用参数正确
    expect(fetchHTML).toHaveBeenCalledTimes(1)
    const [url, opts] = fetchHTML.mock.calls[0]
    expect(url).toBe('https://api.bgm.tv/v0/me')
    expect(opts.headers.Authorization).toBe('Bearer bgm-access-token')

    // updateUserBgmBinding 被调用，bgmUid 转为字符串
    expect(updateUserBgmBinding).toHaveBeenCalledTimes(1)
    expect(updateUserBgmBinding).toHaveBeenCalledWith(
      DB,
      'u1',
      '999',
      expect.any(String),
      expect.any(String)
    )

    // token 含 bgmUid
    const verified = await verifyJwt(token, ENV.JWT_SECRET)
    expect(verified.valid).toBe(true)
    expect(verified.payload.bgmUid).toBe('999')

    expect(user).toEqual({ id: 'u1', email: 'a@b.c', bgmUid: '999' })
  })

  it('Bangumi API 验证失败时抛 401 错误', async () => {
    fetchHTML.mockRejectedValue(new Error('HTTP 401'))

    await expect(bindBangumi(DB, ENV, 'u1', 'bad-token')).rejects.toMatchObject({
      status: 401
    })

    expect(updateUserBgmBinding).not.toHaveBeenCalled()
  })

  it('Bangumi API 返回无 id 时抛 401 错误', async () => {
    fetchHTML.mockResolvedValue(JSON.stringify({ username: 'no-id-user' }))

    await expect(bindBangumi(DB, ENV, 'u1', 'token')).rejects.toMatchObject({
      status: 401
    })
  })

  it('用户不存在时抛 404 错误', async () => {
    fetchHTML.mockResolvedValue(JSON.stringify({ id: 1 }))
    updateUserBgmBinding.mockResolvedValue(null)

    await expect(bindBangumi(DB, ENV, 'no-such-user', 'token')).rejects.toMatchObject({
      status: 404
    })
  })
})

describe('refreshJwt', () => {
  it('有效 token 返回新 token 与 user', async () => {
    const oldToken = await signJwt({ userId: 'u1', email: 'a@b.c' }, ENV.JWT_SECRET)
    const user = {
      id: 'u1',
      email: 'a@b.c',
      bgmUid: '50',
      createdAt: 1,
      updatedAt: 2
    }
    getUserById.mockResolvedValue(user)

    const { token, user: returnedUser } = await refreshJwt(DB, ENV, oldToken)

    const verified = await verifyJwt(token, ENV.JWT_SECRET)
    expect(verified.valid).toBe(true)
    expect(verified.payload.userId).toBe('u1')
    expect(verified.payload.bgmUid).toBe('50')

    expect(returnedUser).toEqual({ id: 'u1', email: 'a@b.c', bgmUid: '50' })
    // 新 token 与旧 token 不同（旧 token 无 bgmUid，新 token 有）
    expect(token).not.toBe(oldToken)
  })

  it('无效 token 抛 401 错误', async () => {
    await expect(refreshJwt(DB, ENV, 'invalid.token.here')).rejects.toMatchObject({
      status: 401
    })

    expect(getUserById).not.toHaveBeenCalled()
  })

  it('用户不存在时抛 404 错误', async () => {
    const oldToken = await signJwt({ userId: 'u1', email: 'a@b.c' }, ENV.JWT_SECRET)
    getUserById.mockResolvedValue(null)

    await expect(refreshJwt(DB, ENV, oldToken)).rejects.toMatchObject({
      status: 404
    })
  })
})

describe('getCurrentUser', () => {
  it('用户存在时返回 { user: { id, email, bgmUid, isBound } }', async () => {
    getUserById.mockResolvedValue({
      id: 'u1',
      email: 'a@b.c',
      bgmUid: '100',
      createdAt: 1,
      updatedAt: 2
    })

    const result = await getCurrentUser(DB, ENV, 'u1')

    expect(result.user).toEqual({
      id: 'u1',
      email: 'a@b.c',
      bgmUid: '100',
      isBound: true
    })
  })

  it('未绑定 Bangumi 时 isBound 为 false', async () => {
    getUserById.mockResolvedValue({
      id: 'u1',
      email: 'a@b.c',
      bgmUid: null,
      createdAt: 1,
      updatedAt: 2
    })

    const result = await getCurrentUser(DB, ENV, 'u1')

    expect(result.user.bgmUid).toBeNull()
    expect(result.user.isBound).toBe(false)
  })

  it('用户不存在时抛 404 错误', async () => {
    getUserById.mockResolvedValue(null)

    await expect(getCurrentUser(DB, ENV, 'no-such-user')).rejects.toMatchObject({
      status: 404
    })
  })
})

describe('getUserBgmToken', () => {
  it('已绑定时返回明文 token', async () => {
    const plainToken = 'bgm-access-token-123'
    const { encrypted, iv } = await encryptToken(plainToken, ENV.JWT_SECRET)
    getUserBgmBinding.mockResolvedValue({
      bgmUid: '100',
      bgmTokenEncrypted: encrypted,
      bgmTokenIv: iv
    })

    const result = await getUserBgmToken(DB, ENV, 'u1')
    expect(result).toBe(plainToken)
  })

  it('未绑定时返回 null', async () => {
    getUserBgmBinding.mockResolvedValue(null)

    expect(await getUserBgmToken(DB, ENV, 'u1')).toBeNull()
  })

  it('绑定信息不完整时返回 null', async () => {
    getUserBgmBinding.mockResolvedValue({
      bgmUid: '100',
      bgmTokenEncrypted: null,
      bgmTokenIv: null
    })

    expect(await getUserBgmToken(DB, ENV, 'u1')).toBeNull()
  })

  it('解密失败时返回 null', async () => {
    getUserBgmBinding.mockResolvedValue({
      bgmUid: '100',
      bgmTokenEncrypted: '00'.repeat(20),
      bgmTokenIv: '00'.repeat(12)
    })

    expect(await getUserBgmToken(DB, ENV, 'u1')).toBeNull()
  })
})
