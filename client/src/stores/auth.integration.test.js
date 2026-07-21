/**
 * @file auth store 集成测试：Bangmio 绑定后 effectiveUser 流程
 *
 * 覆盖 Task 22 场景：
 * 1. Bangmio 注册 → 绑定 → effectiveUser 不为空
 * 2. fetchBgmUserProfile 在绑定后被调用
 * 3. checkAuth 换设备登录时自动拉取 bgmUserProfile
 * 4. Bangumi 直登用户 effectiveUser 返回 user
 * 5. 解绑后 bgmUserProfile 被清空
 *
 * 另覆盖 Task 7 / 15 的密码管理 actions：
 * 6. changePassword / forgotPassword / resetPassword 调用正确的 API
 * 7. fetchBgmUserProfile 失败时静默
 *
 * 通过 mock api 模块与 router 模块，在 node 环境下端到端验证 store 行为。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// Mock api 模块（默认导出 axios 实例）
vi.mock('../api/index', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    put: vi.fn()
  }
}))

// Mock router 模块（默认导出 router 实例）
vi.mock('../router', () => ({
  default: {
    push: vi.fn(),
    currentRoute: { value: { query: {} } }
  }
}))

// node 环境无 localStorage，提供内存 mock
// vi.stubGlobal 在模块顶层调用，保证 useAuthStore() 首次执行前 localStorage 已就绪
const _storage = {}
vi.stubGlobal('localStorage', {
  getItem: vi.fn(key => (key in _storage ? _storage[key] : null)),
  setItem: vi.fn((key, value) => {
    _storage[key] = String(value)
  }),
  removeItem: vi.fn(key => {
    delete _storage[key]
  }),
  clear: vi.fn(() => {
    for (const k of Object.keys(_storage)) delete _storage[k]
  })
})

import api from '../api/index'
import { useAuthStore } from './auth'

/** 构造成功的 api 响应：{ data: { data } } */
function ok(data) {
  return Promise.resolve({ data: { data } })
}

/** 构造 api 错误对象（用于 mockRejectedValueOnce） */
function makeError(message, status = 400) {
  const err = new Error(message)
  err.response = { status, data: { error: message } }
  return err
}

/** 构造失败的 api 响应 promise（用于 mockImplementationOnce 的返回值） */
function fail(message, status = 400) {
  return Promise.reject(makeError(message, status))
}

/** JWT 格式 token（三段以点分隔），避免被 migrateOldKeys 误迁移 */
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ1MSJ9.mock-signature'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.clearAllMocks()
})

describe('Task 22: Bangmio 绑定后 effectiveUser 流程', () => {
  it('Bangmio 注册 → 绑定 → effectiveUser 不为空，fetchBgmUserProfile 被调用', async () => {
    const auth = useAuthStore()

    // 1. 注册：返回未绑定的 Bangmio 用户
    api.post.mockImplementationOnce(url => {
      if (url === '/auth/register') {
        return ok({
          token: 'jwt-register',
          user: { id: 'u1', email: 'test@bangmio.com', bgmUid: null }
        })
      }
      return fail('unexpected call')
    })

    await auth.registerWithBangmio('test@bangmio.com', 'password123', '123456', 'captcha')

    // 注册后：是 Bangmio 用户但未绑定，effectiveUser 为 null
    expect(auth.isBangmioUser).toBe(true)
    expect(auth.bangmioUser.bgmUid).toBeNull()
    expect(auth.effectiveUser).toBeNull()

    // 2. 绑定 Bangumi
    api.post.mockImplementationOnce(url => {
      if (url === '/auth/bind-bangumi') {
        return ok({
          token: 'jwt-bind',
          user: { id: 'u1', email: 'test@bangmio.com', bgmUid: '12345' },
          bgmToken: 'bgm-access-token'
        })
      }
      return fail('unexpected call')
    })

    // 3. fetchBgmUserProfile 调用 /user/me
    api.get.mockImplementationOnce(url => {
      if (url === '/user/me') {
        return ok({
          id: 12345,
          username: 'bgm-user',
          nickname: 'BGM 用户',
          avatar: { large: 'https://bgm.tv/avatar.jpg' },
          sign: '签名'
        })
      }
      return fail('unexpected call')
    })

    await auth.bindBangumi('bgm-access-token-to-bind')

    // 验证 /user/me 被调用（即 fetchBgmUserProfile 被调用）
    expect(api.get).toHaveBeenCalledWith('/user/me')

    // 验证 effectiveUser 不为空且为 Bangumi 资料
    expect(auth.effectiveUser).not.toBeNull()
    expect(auth.effectiveUser).toEqual({
      id: 12345,
      username: 'bgm-user',
      nickname: 'BGM 用户',
      avatar: { large: 'https://bgm.tv/avatar.jpg' },
      sign: '签名'
    })

    // 验证 bgmUserProfile 已写入 state
    expect(auth.bgmUserProfile).toEqual({
      id: 12345,
      username: 'bgm-user',
      nickname: 'BGM 用户',
      avatar: { large: 'https://bgm.tv/avatar.jpg' },
      sign: '签名'
    })

    // 验证 localStorage 已持久化
    const stored = JSON.parse(localStorage.getItem('bgm_user_profile') || 'null')
    expect(stored).toEqual({
      id: 12345,
      username: 'bgm-user',
      nickname: 'BGM 用户',
      avatar: { large: 'https://bgm.tv/avatar.jpg' },
      sign: '签名'
    })
  })

  it('checkAuth 检测 bgmUid 存在但 bgmUserProfile 为空时自动拉取（换设备登录）', async () => {
    // 模拟换设备登录：localStorage 有 token/user 但无 bgm_user_profile
    localStorage.setItem('bangmio_token', JWT_TOKEN)
    localStorage.setItem(
      'bangmio_user',
      JSON.stringify({
        id: 'u1',
        email: 'test@bangmio.com',
        bgmUid: '12345'
      })
    )
    localStorage.setItem('bgm_token_cached', 'cached-bgm-token')
    // 故意不设置 bgm_user_profile

    const auth = useAuthStore()

    // mock /auth/me（fetchCurrentUser 调用）与 /user/me（fetchBgmUserProfile 调用）
    api.get.mockImplementation(url => {
      if (url === '/auth/me') {
        return ok({
          user: { id: 'u1', email: 'test@bangmio.com', bgmUid: '12345' }
        })
      }
      if (url === '/user/me') {
        return ok({
          id: 12345,
          username: 'bgm-user',
          nickname: 'BGM 用户'
        })
      }
      return fail('unexpected call')
    })

    await auth.checkAuth()

    // 验证 /user/me 被调用（fetchBgmUserProfile 被触发）
    expect(api.get).toHaveBeenCalledWith('/user/me')

    // 验证 effectiveUser 不为空
    expect(auth.effectiveUser).not.toBeNull()
    expect(auth.effectiveUser.username).toBe('bgm-user')
  })

  it('Bangumi 直登用户 effectiveUser 返回 user', () => {
    // 模拟 Bangumi 直登
    localStorage.setItem('bangumi_token', 'direct-bgm-token')
    localStorage.setItem(
      'bangumi_user',
      JSON.stringify({
        id: 88888,
        username: 'direct-user',
        nickname: '直登用户'
      })
    )

    const auth = useAuthStore()

    expect(auth.isBangumiDirectUser).toBe(true)
    expect(auth.effectiveUser).toEqual({
      id: 88888,
      username: 'direct-user',
      nickname: '直登用户'
    })
  })

  it('未登录用户 effectiveUser 返回 null', () => {
    const auth = useAuthStore()
    expect(auth.effectiveUser).toBeNull()
  })

  it('解绑后 bgmUserProfile 被清空，effectiveUser 变为 null', async () => {
    // 准备：已绑定的 Bangmio 用户，已有 bgmUserProfile
    localStorage.setItem('bangmio_token', JWT_TOKEN)
    localStorage.setItem(
      'bangmio_user',
      JSON.stringify({
        id: 'u1',
        email: 'test@bangmio.com',
        bgmUid: '12345'
      })
    )
    localStorage.setItem('bgm_token_cached', 'cached-token')
    localStorage.setItem(
      'bgm_user_profile',
      JSON.stringify({
        id: 12345,
        username: 'bgm-user'
      })
    )

    const auth = useAuthStore()

    // 验证初始状态：effectiveUser 不为空
    expect(auth.effectiveUser).toEqual({ id: 12345, username: 'bgm-user' })

    // 解绑
    api.delete.mockResolvedValueOnce({ data: { data: { success: true } } })

    await auth.unbindBangumi()

    // 验证 bgmUserProfile 已清空
    expect(auth.bgmUserProfile).toBeNull()
    expect(localStorage.getItem('bgm_user_profile')).toBeNull()

    // effectiveUser 变为 null（Bangmio 用户，bgmUserProfile 为空）
    expect(auth.effectiveUser).toBeNull()
  })

  it('OAuth 绑定成功后也调用 fetchBgmUserProfile', async () => {
    // 先设置已登录但未绑定的 Bangmio 用户
    localStorage.setItem('bangmio_token', JWT_TOKEN)
    localStorage.setItem(
      'bangmio_user',
      JSON.stringify({
        id: 'u1',
        email: 'test@bangmio.com',
        bgmUid: null
      })
    )

    const auth = useAuthStore()

    // OAuth 绑定回调
    api.post.mockImplementationOnce(url => {
      if (url === '/auth/oauth-bind-callback') {
        return ok({
          token: 'jwt-new',
          user: { id: 'u1', email: 'test@bangmio.com', bgmUid: '12345' },
          bgmToken: 'bgm-oauth-token'
        })
      }
      return fail('unexpected call')
    })

    api.get.mockImplementationOnce(url => {
      if (url === '/user/me') {
        return ok({ id: 12345, username: 'oauth-user' })
      }
      return fail('unexpected call')
    })

    await auth.oauthBindBangumi('code', 'state')

    // 验证 /user/me 被调用
    expect(api.get).toHaveBeenCalledWith('/user/me')

    // 验证 effectiveUser 不为空
    expect(auth.effectiveUser).not.toBeNull()
    expect(auth.effectiveUser.username).toBe('oauth-user')
  })
})

describe('Task 7 + 15: 密码管理 actions', () => {
  it('changePassword 调用 POST /auth/change-password', async () => {
    const auth = useAuthStore()

    api.post.mockResolvedValueOnce({ data: { data: { success: true } } })

    await auth.changePassword('oldPass', 'newPass123')

    expect(api.post).toHaveBeenCalledWith('/auth/change-password', {
      currentPassword: 'oldPass',
      newPassword: 'newPass123'
    })
  })

  it('changePassword 失败时写入 error 并抛出', async () => {
    const auth = useAuthStore()

    api.post.mockRejectedValueOnce(makeError('原密码错误', 400))

    await expect(auth.changePassword('wrong', 'newPass123')).rejects.toThrow()
    expect(auth.error).toBe('原密码错误')
  })

  it('forgotPassword 调用 POST /auth/forgot-password', async () => {
    const auth = useAuthStore()

    api.post.mockResolvedValueOnce({ data: { data: { success: true } } })

    await auth.forgotPassword('test@bangmio.com', 'captcha-token')

    expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', {
      email: 'test@bangmio.com',
      captchaToken: 'captcha-token'
    })
  })

  it('resetPassword 调用 POST /auth/reset-password', async () => {
    const auth = useAuthStore()

    api.post.mockResolvedValueOnce({ data: { data: { success: true } } })

    await auth.resetPassword('test@bangmio.com', '123456', 'newPass123')

    expect(api.post).toHaveBeenCalledWith('/auth/reset-password', {
      email: 'test@bangmio.com',
      code: '123456',
      newPassword: 'newPass123'
    })
  })

  it('fetchBgmUserProfile 失败时静默，不抛错、不写 error', async () => {
    // 需要有 bangmioToken 才会真正发起请求
    localStorage.setItem('bangmio_token', JWT_TOKEN)
    const auth = useAuthStore()

    api.get.mockRejectedValueOnce(makeError('网络错误', 500))

    // 不应抛错
    await expect(auth.fetchBgmUserProfile()).resolves.toBeUndefined()
    // 不应写 error
    expect(auth.error).toBe('')
    // bgmUserProfile 保持 null
    expect(auth.bgmUserProfile).toBeNull()
  })
})
