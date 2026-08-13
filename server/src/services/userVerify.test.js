/**
 * userVerify.js 单元测试（PROJECT_ISSUES 7.2：X-Bangumi-Username 伪造防护）。
 *
 * 通过 mock bangumi.js 的 getClient 验证：
 * 1. 首次验证调用 /v0/me 且 username 匹配 → true
 * 2. username 不匹配 → false（拒绝）
 * 3. 上游异常 → fail-open 返回 true
 * 4. 缓存命中：10 分钟 TTL 内不重复调用 /v0/me
 * 5. 缺少 token/username → false（不发请求）
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()
vi.mock('./bangumi.js', () => ({
  getClient: () => ({ get: mockGet })
}))

let verifyBangumiUsername

beforeEach(async () => {
  vi.resetModules()
  mockGet.mockReset()
  const mod = await import('./userVerify.js')
  verifyBangumiUsername = mod.verifyBangumiUsername
})

describe('verifyBangumiUsername', () => {
  it('缺少 token 或 username 直接拒绝，不发请求', async () => {
    expect(await verifyBangumiUsername('', 'user1')).toBe(false)
    expect(await verifyBangumiUsername('token', '')).toBe(false)
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('username 与 token 匹配 → true，并调用一次 /v0/me', async () => {
    mockGet.mockResolvedValueOnce({ id: 1, username: 'acgpzh', nickname: '老哥' })

    const ok = await verifyBangumiUsername('valid-token', 'acgpzh')
    expect(ok).toBe(true)
    expect(mockGet).toHaveBeenCalledTimes(1)
    expect(mockGet).toHaveBeenCalledWith('/v0/me')
  })

  it('nickname 或 id 匹配也算通过', async () => {
    mockGet.mockResolvedValueOnce({ id: 12345, username: 'someone', nickname: '某昵称' })
    expect(await verifyBangumiUsername('t', '某昵称')).toBe(true)

    mockGet.mockResolvedValueOnce({ id: 12345, username: 'someone', nickname: '' })
    expect(await verifyBangumiUsername('t', '12345')).toBe(true)
  })

  it('username 不匹配 → false（拒绝伪造）', async () => {
    mockGet.mockResolvedValueOnce({ id: 1, username: 'real-user', nickname: '' })

    const ok = await verifyBangumiUsername('stolen-token', 'victim-user')
    expect(ok).toBe(false)
  })

  it('上游异常 → fail-open 返回 true（避免上游抖动误伤）', async () => {
    mockGet.mockRejectedValueOnce(new Error('HTTP 500'))

    const ok = await verifyBangumiUsername('token', 'user1')
    expect(ok).toBe(true)
  })

  it('TTL 缓存命中：同一 username 只验证一次', async () => {
    mockGet.mockResolvedValue({ id: 1, username: 'acgpzh', nickname: '' })

    await verifyBangumiUsername('token', 'acgpzh')
    await verifyBangumiUsername('token', 'acgpzh')
    await verifyBangumiUsername('token2', 'acgpzh')

    expect(mockGet).toHaveBeenCalledTimes(1)
  })
})
