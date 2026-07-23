import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock users.js 全部函数
vi.mock('../db/users.js', () => ({
  createUser: vi.fn(),
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
  updateUserBgmBinding: vi.fn(),
  clearUserBgmBinding: vi.fn(),
  getUserBgmBinding: vi.fn(),
  userExistsByEmail: vi.fn(),
  getUserCredentialsById: vi.fn(),
  updateUserPassword: vi.fn()
}))

// Mock emailCodes.js（验证码相关）
vi.mock('../db/emailCodes.js', () => ({
  generateNumericCode: vi.fn(() => '123456'),
  createCode: vi.fn(),
  getLatestCode: vi.fn(),
  verifyCode: vi.fn(),
  canResend: vi.fn(() => true),
  resendCooldownSeconds: vi.fn(() => 0)
}))

// Mock email.js（邮件发送）
vi.mock('../utils/email.js', () => ({
  sendEmail: vi.fn(),
  buildVerificationEmailHTML: vi.fn(() => '<html>mock</html>')
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
  getUserBgmToken,
  sendVerificationCode,
  changeUserPassword,
  resetUserPassword
} from './auth.js'
import {
  createUser,
  getUserByEmail,
  getUserById,
  updateUserBgmBinding,
  getUserBgmBinding,
  userExistsByEmail,
  getUserCredentialsById,
  updateUserPassword
} from '../db/users.js'
import { verifyCode, createCode, getLatestCode } from '../db/emailCodes.js'
import { sendEmail } from '../utils/email.js'
import { fetchHTML } from '../utils/http.js'
import { hashPassword, generateSalt, encryptToken } from '../utils/crypto.js'
import { signJwt, verifyJwt } from '../utils/jwt.js'

const ENV = {
  JWT_SECRET: 'test-secret-at-least-32-chars-long',
  BGMIO_SALT: 'test-salt',
  RESEND_API_KEY: 're_test_key'
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
      registerUser(DB, ENV, {
        email: 'existing@test.com',
        password: 'pwd',
        code: '123456'
      })
    ).rejects.toMatchObject({ status: 409 })

    expect(createUser).not.toHaveBeenCalled()
  })

  it('未提供验证码时抛 400 错误', async () => {
    userExistsByEmail.mockResolvedValue(false)

    await expect(
      registerUser(DB, ENV, { email: 'new@test.com', password: 'pwd123' })
    ).rejects.toMatchObject({ status: 400, message: '请输入邮箱验证码' })

    expect(verifyCode).not.toHaveBeenCalled()
    expect(createUser).not.toHaveBeenCalled()
  })

  it('验证码错误时抛 400 错误', async () => {
    userExistsByEmail.mockResolvedValue(false)
    verifyCode.mockResolvedValue(false)

    await expect(
      registerUser(DB, ENV, {
        email: 'new@test.com',
        password: 'pwd123',
        code: 'wrong'
      })
    ).rejects.toMatchObject({ status: 400, message: '验证码错误或已过期' })

    expect(createUser).not.toHaveBeenCalled()
  })

  it('新邮箱 + 有效验证码 → 成功注册并返回有效 JWT 与 user', async () => {
    userExistsByEmail.mockResolvedValue(false)
    verifyCode.mockResolvedValue(true)
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
      password: 'pwd123',
      code: '123456'
    })

    // 验证码被校验
    expect(verifyCode).toHaveBeenCalledWith(DB, 'new@test.com', '123456', 'register')

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

  it('未配置 RESEND_API_KEY 时跳过验证码校验（降级模式）', async () => {
    userExistsByEmail.mockResolvedValue(false)
    const createdUser = {
      id: 'no-code-user',
      email: 'nocode@test.com',
      bgmUid: null,
      createdAt: 1,
      updatedAt: 1
    }
    createUser.mockResolvedValue(createdUser)

    // 不传 code，且 ENV 不含 RESEND_API_KEY
    const { token, user } = await registerUser(
      DB,
      { ...ENV, RESEND_API_KEY: '' },
      {
        email: 'nocode@test.com',
        password: 'pwd123'
      }
    )

    // 验证码未校验
    expect(verifyCode).not.toHaveBeenCalled()
    // 注册成功
    expect(user).toEqual({ id: 'no-code-user', email: 'nocode@test.com', bgmUid: null })
    const verified = await verifyJwt(token, ENV.JWT_SECRET)
    expect(verified.valid).toBe(true)
  })
})

describe('sendVerificationCode', () => {
  it('冷却时间内返回 sent: false 与剩余秒数', async () => {
    getLatestCode.mockResolvedValue({ createdAt: Date.now() })
    // canResend 默认返回 true，需覆盖
    const { canResend } = await import('../db/emailCodes.js')
    canResend.mockReturnValue(false)
    const { resendCooldownSeconds } = await import('../db/emailCodes.js')
    resendCooldownSeconds.mockReturnValue(45)

    const result = await sendVerificationCode(DB, ENV, { email: 'a@b.c', purpose: 'register' })

    expect(result).toEqual({ sent: false, cooldownSeconds: 45 })
    expect(createCode).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('未配置 RESEND_API_KEY 时抛 500 错误', async () => {
    getLatestCode.mockResolvedValue(null)
    const { canResend } = await import('../db/emailCodes.js')
    canResend.mockReturnValue(true)

    await expect(
      sendVerificationCode(DB, { ...ENV, RESEND_API_KEY: '' }, { email: 'a@b.c' })
    ).rejects.toMatchObject({ status: 500, message: '邮件服务未配置（缺少 RESEND_API_KEY）' })
  })

  it('正常发送验证码 → 生成 6 位码、写入 D1、调用 Resend', async () => {
    getLatestCode.mockResolvedValue(null)
    const { canResend } = await import('../db/emailCodes.js')
    canResend.mockReturnValue(true)
    sendEmail.mockResolvedValue({ id: 'email-id' })

    const result = await sendVerificationCode(DB, ENV, { email: 'a@b.c', purpose: 'register' })

    expect(result).toEqual({ sent: true, cooldownSeconds: 0 })
    expect(createCode).toHaveBeenCalledTimes(1)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    const [emailArg] = sendEmail.mock.calls[0]
    expect(emailArg.to).toBe('a@b.c')
    expect(emailArg.subject).toContain('Bangmio验证码是')
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

describe('changeUserPassword', () => {
  it('新密码 < 8 位时抛 400 错误', async () => {
    await expect(changeUserPassword(DB, ENV, 'u1', 'current-pwd', 'short')).rejects.toMatchObject({
      status: 400,
      message: '新密码至少 8 位'
    })

    expect(getUserCredentialsById).not.toHaveBeenCalled()
    expect(updateUserPassword).not.toHaveBeenCalled()
  })

  it('原密码错误时抛 400 错误', async () => {
    const salt = generateSalt()
    const passwordHash = await hashPassword('correct-pwd', salt)
    getUserCredentialsById.mockResolvedValue({
      id: 'u1',
      email: 'a@b.c',
      salt,
      passwordHash,
      bgmUid: null
    })

    await expect(
      changeUserPassword(DB, ENV, 'u1', 'wrong-pwd', 'new-password-123')
    ).rejects.toMatchObject({ status: 400, message: '原密码错误' })

    expect(updateUserPassword).not.toHaveBeenCalled()
  })

  it('用户不存在时抛 404 错误', async () => {
    getUserCredentialsById.mockResolvedValue(null)

    await expect(
      changeUserPassword(DB, ENV, 'no-such-user', 'any-pwd', 'new-password-123')
    ).rejects.toMatchObject({ status: 404 })

    expect(updateUserPassword).not.toHaveBeenCalled()
  })

  it('原密码正确时调用 updateUserPassword，参数为新 hash + salt', async () => {
    const oldSalt = generateSalt()
    const oldPasswordHash = await hashPassword('correct-pwd', oldSalt)
    getUserCredentialsById.mockResolvedValue({
      id: 'u1',
      email: 'a@b.c',
      salt: oldSalt,
      passwordHash: oldPasswordHash,
      bgmUid: null
    })
    updateUserPassword.mockResolvedValue(undefined)

    const result = await changeUserPassword(DB, ENV, 'u1', 'correct-pwd', 'new-password-123')

    expect(result).toEqual({ success: true })

    // updateUserPassword 被调用一次
    expect(updateUserPassword).toHaveBeenCalledTimes(1)
    const [dbArg, idArg, passwordHashArg, saltArg] = updateUserPassword.mock.calls[0]
    expect(dbArg).toBe(DB)
    expect(idArg).toBe('u1')
    // 新 hash 为 64 字符 hex
    expect(passwordHashArg).toMatch(/^[0-9a-f]{64}$/)
    // 新 salt 为 32 字符 hex
    expect(saltArg).toMatch(/^[0-9a-f]{32}$/)
    // 新 hash/salt 与旧的必须不同
    expect(passwordHashArg).not.toBe(oldPasswordHash)
    expect(saltArg).not.toBe(oldSalt)
    // 新 hash 与新 salt 必须匹配（用新 salt 重新 hash 'new-password-123' 应等于传入的 hash）
    const recomputed = await hashPassword('new-password-123', saltArg)
    expect(recomputed).toBe(passwordHashArg)
  })
})

describe('resetUserPassword', () => {
  it('新密码 < 8 位时抛 400 错误', async () => {
    await expect(
      resetUserPassword(DB, ENV, {
        email: 'a@b.c',
        code: '123456',
        newPassword: 'short'
      })
    ).rejects.toMatchObject({ status: 400, message: '新密码至少 8 位' })

    expect(verifyCode).not.toHaveBeenCalled()
    expect(updateUserPassword).not.toHaveBeenCalled()
  })

  it('验证码错误时抛 400 错误', async () => {
    verifyCode.mockResolvedValue(false)

    await expect(
      resetUserPassword(DB, ENV, {
        email: 'a@b.c',
        code: 'wrong-code',
        newPassword: 'new-password-123'
      })
    ).rejects.toMatchObject({ status: 400, message: '验证码错误或已过期' })

    // 验证码校验使用 purpose='reset'
    expect(verifyCode).toHaveBeenCalledWith(DB, 'a@b.c', 'wrong-code', 'reset')
    expect(getUserByEmail).not.toHaveBeenCalled()
    expect(updateUserPassword).not.toHaveBeenCalled()
  })

  it('验证码正确但用户不存在时抛 404 错误', async () => {
    verifyCode.mockResolvedValue(true)
    getUserByEmail.mockResolvedValue(null)

    await expect(
      resetUserPassword(DB, ENV, {
        email: 'a@b.c',
        code: '123456',
        newPassword: 'new-password-123'
      })
    ).rejects.toMatchObject({ status: 404 })

    expect(updateUserPassword).not.toHaveBeenCalled()
  })

  it('验证码正确且用户存在时调用 updateUserPassword', async () => {
    verifyCode.mockResolvedValue(true)
    const oldSalt = generateSalt()
    const oldPasswordHash = await hashPassword('old-pwd', oldSalt)
    getUserByEmail.mockResolvedValue({
      id: 'u1',
      email: 'a@b.c',
      salt: oldSalt,
      passwordHash: oldPasswordHash,
      bgmUid: null
    })
    updateUserPassword.mockResolvedValue(undefined)

    const result = await resetUserPassword(DB, ENV, {
      email: 'a@b.c',
      code: '123456',
      newPassword: 'new-password-123'
    })

    expect(result).toEqual({ success: true })

    // 验证码校验使用 purpose='reset'
    expect(verifyCode).toHaveBeenCalledWith(DB, 'a@b.c', '123456', 'reset')

    // updateUserPassword 被调用，userId 来自 getUserByEmail 返回值
    expect(updateUserPassword).toHaveBeenCalledTimes(1)
    const [dbArg, idArg, passwordHashArg, saltArg] = updateUserPassword.mock.calls[0]
    expect(dbArg).toBe(DB)
    expect(idArg).toBe('u1')
    expect(passwordHashArg).toMatch(/^[0-9a-f]{64}$/)
    expect(saltArg).toMatch(/^[0-9a-f]{32}$/)
    expect(passwordHashArg).not.toBe(oldPasswordHash)
    expect(saltArg).not.toBe(oldSalt)
    // 新 hash 与新 salt 匹配
    const recomputed = await hashPassword('new-password-123', saltArg)
    expect(recomputed).toBe(passwordHashArg)
  })
})
