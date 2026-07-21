import { describe, it, expect } from 'vitest'
import {
  generateSalt,
  hashPassword,
  verifyPassword,
  deriveKey,
  encryptToken,
  decryptToken,
  bufferToHex,
  hexToBuffer
} from './crypto.js'

const SECRET = 'test-secret-at-least-32-chars-long'

describe('generateSalt', () => {
  it('返回 32 字符的 hex 字符串（16 字节）', () => {
    const salt = generateSalt()
    expect(typeof salt).toBe('string')
    expect(salt.length).toBe(32)
    expect(salt).toMatch(/^[0-9a-f]{32}$/)
  })

  it('两次调用返回不同值', () => {
    const a = generateSalt()
    const b = generateSalt()
    expect(a).not.toBe(b)
  })
})

describe('hashPassword', () => {
  it('返回 64 字符的 hex 字符串（256 bit）', async () => {
    const salt = generateSalt()
    const hash = await hashPassword('password123', salt)
    expect(typeof hash).toBe('string')
    expect(hash.length).toBe(64)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('相同 password 与 salt 产生相同 hash', async () => {
    const salt = generateSalt()
    const a = await hashPassword('password123', salt)
    const b = await hashPassword('password123', salt)
    expect(a).toBe(b)
  })

  it('不同 salt 产生不同 hash', async () => {
    const hash1 = await hashPassword('password123', generateSalt())
    const hash2 = await hashPassword('password123', generateSalt())
    expect(hash1).not.toBe(hash2)
  })
})

describe('verifyPassword', () => {
  it('正确密码返回 true', async () => {
    const salt = generateSalt()
    const hash = await hashPassword('correct-pwd', salt)
    const ok = await verifyPassword('correct-pwd', salt, hash)
    expect(ok).toBe(true)
  })

  it('错误密码返回 false', async () => {
    const salt = generateSalt()
    const hash = await hashPassword('correct-pwd', salt)
    const ok = await verifyPassword('wrong-pwd', salt, hash)
    expect(ok).toBe(false)
  })

  it('使用不同 salt 验证失败', async () => {
    const salt1 = generateSalt()
    const hash = await hashPassword('correct-pwd', salt1)
    const salt2 = generateSalt()
    const ok = await verifyPassword('correct-pwd', salt2, hash)
    expect(ok).toBe(false)
  })
})

describe('deriveKey', () => {
  it('返回 AES-256-GCM CryptoKey', async () => {
    const key = await deriveKey(SECRET, generateSalt())
    expect(key).toBeInstanceOf(CryptoKey)
    expect(key.algorithm.name).toBe('AES-GCM')
    expect(key.algorithm.length).toBe(256)
    expect(key.usages).toContain('encrypt')
    expect(key.usages).toContain('decrypt')
  })
})

describe('encryptToken / decryptToken', () => {
  it('encryptToken 返回 { encrypted, iv } hex 字符串', async () => {
    const result = await encryptToken('bgm-access-token', SECRET)
    expect(result).toHaveProperty('encrypted')
    expect(result).toHaveProperty('iv')
    expect(typeof result.encrypted).toBe('string')
    expect(typeof result.iv).toBe('string')
    expect(result.encrypted).toMatch(/^[0-9a-f]+$/)
    expect(result.iv).toMatch(/^[0-9a-f]+$/)
    // IV 为 12 字节 = 24 hex 字符
    expect(result.iv.length).toBe(24)
  })

  it('decryptToken 返回原 token', async () => {
    const token = 'bgm-access-token-xyz'
    const { encrypted, iv } = await encryptToken(token, SECRET)
    const decrypted = await decryptToken(encrypted, iv, SECRET)
    expect(decrypted).toBe(token)
  })

  it('两次加密生成不同 IV 与密文', async () => {
    const token = 'same-token'
    const a = await encryptToken(token, SECRET)
    const b = await encryptToken(token, SECRET)
    expect(a.iv).not.toBe(b.iv)
    expect(a.encrypted).not.toBe(b.encrypted)
  })

  it('decryptToken 使用错误 secret 失败（AES-GCM 校验）', async () => {
    const { encrypted, iv } = await encryptToken('token', SECRET)
    await expect(decryptToken(encrypted, iv, 'wrong-secret-also-32-chars-long')).rejects.toThrow()
  })

  it('decryptToken 使用错误 IV 失败', async () => {
    const { encrypted } = await encryptToken('token', SECRET)
    const wrongIv = bufferToHex(crypto.getRandomValues(new Uint8Array(12)).buffer)
    await expect(decryptToken(encrypted, wrongIv, SECRET)).rejects.toThrow()
  })

  it('支持 Unicode 字符的加解密', async () => {
    const token = 'bangumi-日本語-token-🔧'
    const { encrypted, iv } = await encryptToken(token, SECRET)
    const decrypted = await decryptToken(encrypted, iv, SECRET)
    expect(decrypted).toBe(token)
  })
})

describe('bufferToHex / hexToBuffer', () => {
  it('bufferToHex 返回小写 hex 字符串', () => {
    const bytes = new Uint8Array([0, 15, 16, 255, 10])
    const hex = bufferToHex(bytes.buffer)
    expect(hex).toBe('000f10ff0a')
  })

  it('hexToBuffer 返回对应字节', () => {
    const hex = '000f10ff0a'
    const buf = hexToBuffer(hex)
    const bytes = new Uint8Array(buf)
    expect(Array.from(bytes)).toEqual([0, 15, 16, 255, 10])
  })

  it('bufferToHex 与 hexToBuffer 互转正确', () => {
    const original = new Uint8Array([0, 1, 2, 3, 128, 200, 255])
    const hex = bufferToHex(original.buffer)
    const back = new Uint8Array(hexToBuffer(hex))
    expect(Array.from(back)).toEqual(Array.from(original))
  })

  it('空缓冲区转 hex 为空字符串', () => {
    const empty = new Uint8Array(0).buffer
    expect(bufferToHex(empty)).toBe('')
    expect(new Uint8Array(hexToBuffer('')).length).toBe(0)
  })
})
