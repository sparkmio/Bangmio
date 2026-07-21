import { describe, it, expect } from 'vitest'
import { signJwt, verifyJwt, base64urlEncode } from './jwt.js'

const SECRET = 'test-secret-at-least-32-chars-long'
const WRONG_SECRET = 'another-secret-that-is-different'

describe('signJwt', () => {
  it('返回三段 base64url 用 . 分隔的 JWT 字符串', async () => {
    const token = await signJwt({ userId: 'u1', email: 'a@b.c' }, SECRET)
    expect(typeof token).toBe('string')
    const parts = token.split('.')
    expect(parts.length).toBe(3)
    parts.forEach(p => {
      expect(p).toMatch(/^[A-Za-z0-9_-]+$/)
    })
  })

  it('默认有效期 7 天（exp - iat = 604800）', async () => {
    const token = await signJwt({ userId: 'u1', email: 'a@b.c' }, SECRET)
    const { payload } = await verifyJwt(token, SECRET)
    expect(payload.exp - payload.iat).toBe(7 * 24 * 3600)
  })

  it('包含 bgmUid 时被保留在 payload', async () => {
    const token = await signJwt({ userId: 'u1', email: 'a@b.c', bgmUid: '12345' }, SECRET)
    const { payload } = await verifyJwt(token, SECRET)
    expect(payload.bgmUid).toBe('12345')
  })
})

describe('verifyJwt', () => {
  it('有效 token 返回 { valid: true, payload }', async () => {
    const token = await signJwt({ userId: 'u1', email: 'a@b.c' }, SECRET)
    const result = await verifyJwt(token, SECRET)
    expect(result.valid).toBe(true)
    expect(result.payload).toBeDefined()
    expect(result.payload.userId).toBe('u1')
    expect(result.payload.email).toBe('a@b.c')
    expect(typeof result.payload.iat).toBe('number')
    expect(typeof result.payload.exp).toBe('number')
  })

  it('错误 secret 返回 { valid: false, error }', async () => {
    const token = await signJwt({ userId: 'u1', email: 'a@b.c' }, SECRET)
    const result = await verifyJwt(token, WRONG_SECRET)
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
    expect(typeof result.error).toBe('string')
  })

  it('过期 token 返回 { valid: false, error }', async () => {
    // 使用 -1 秒有效期，确保 exp 已过
    const token = await signJwt({ userId: 'u1', email: 'a@b.c' }, SECRET, -1)
    const result = await verifyJwt(token, SECRET)
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('无效格式 token 返回 { valid: false, error }', async () => {
    const result = await verifyJwt('invalid.token', SECRET)
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('空字符串 token 返回 { valid: false, error }', async () => {
    const result = await verifyJwt('', SECRET)
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('篡改 payload 后签名校验失败', async () => {
    const token = await signJwt({ userId: 'u1', email: 'a@b.c' }, SECRET)
    const [header, , sig] = token.split('.')
    const tamperedBody = base64urlEncode(
      new TextEncoder().encode(
        JSON.stringify({ userId: 'hacker', email: 'x@y.z', iat: 0, exp: 9999999999 })
      )
    )
    const tamperedToken = `${header}.${tamperedBody}.${sig}`
    const result = await verifyJwt(tamperedToken, SECRET)
    expect(result.valid).toBe(false)
  })

  it('包含 bgmUid 时 payload 含 bgmUid', async () => {
    const token = await signJwt({ userId: 'u1', email: 'a@b.c', bgmUid: '67890' }, SECRET)
    const { valid, payload } = await verifyJwt(token, SECRET)
    expect(valid).toBe(true)
    expect(payload.bgmUid).toBe('67890')
  })
})
