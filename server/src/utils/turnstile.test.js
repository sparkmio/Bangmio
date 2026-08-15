import { afterEach, describe, expect, it, vi } from 'vitest'
import { verifyTurnstile } from './turnstile.js'

describe('verifyTurnstile', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('未配置 secret 时仅标记为跳过', async () => {
    await expect(verifyTurnstile('', '')).resolves.toEqual({ success: true, skipped: true })
  })

  it('配置 secret 但未提供 token 时拒绝请求', async () => {
    await expect(verifyTurnstile('', 'secret')).resolves.toMatchObject({ success: false })
  })

  it('siteverify 网络异常时失败关闭', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

    await expect(verifyTurnstile('token', 'secret')).resolves.toMatchObject({
      success: false,
      reason: 'network-error'
    })
  })
})
