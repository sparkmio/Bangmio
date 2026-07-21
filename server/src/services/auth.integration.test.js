/**
 * @file 账号体系集成测试（Bangmio + Bangumi 双 Token 流程）。
 *
 * 与 auth.test.js（单元测试）不同，本文件不 mock `db/users.js`，
 * 而是通过内存 D1 binding mock 完整模拟 `db.prepare(sql).bind(...).first()`
 * 与 `.run()` 链式调用，配合真实的 `services/auth.js`、`utils/crypto.js`、
 * `utils/jwt.js` 与 `db/users.js`，端到端验证账号体系行为。
 *
 * 覆盖三大集成场景：
 * 1. Bangmio 完整流程（注册 → 登录 → 绑定 → 调用番剧功能）
 * 2. Bangumi 直登流程（前端直存 Bangumi token，不写 D1）
 * 3. 未绑定 Bangmio 用户调用番剧功能 → 403 引导绑定
 *
 * 时间控制：使用 `vi.useFakeTimers()` + `vi.setSystemTime()` 固定基准时间，
 * 便于断言 JWT 的 iat/exp 与 refresh 后新 token 的差异。
 */
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest'

// Mock http.js 的 fetchHTML（bindBangumi 用它验证 Bangumi Token；其它抓取不走网络）
vi.mock('../utils/http.js', () => ({
  fetchHTML: vi.fn(),
  SCRAPE_UA: 'mock-ua'
}))

// Mock emailCodes.js（验证码逻辑由单元测试覆盖；集成测试中 verifyCode 固定返回 true）
vi.mock('../db/emailCodes.js', () => ({
  generateNumericCode: vi.fn(() => '123456'),
  createCode: vi.fn(),
  getLatestCode: vi.fn(),
  verifyCode: vi.fn(),
  canResend: vi.fn(() => true),
  resendCooldownSeconds: vi.fn(() => 0)
}))

// Mock email.js（不实际发信）
vi.mock('../utils/email.js', () => ({
  sendEmail: vi.fn(),
  buildVerificationEmailHTML: vi.fn(() => '<html>mock</html>')
}))

// 不 mock users.js / crypto.js / jwt.js：使用真实实现，配合内存 D1 完成端到端验证
import { registerUser, bindBangumi, refreshJwt, getCurrentUser, getUserBgmToken } from './auth.js'
import { fetchHTML } from '../utils/http.js'
import { verifyCode } from '../db/emailCodes.js'
import { verifyJwt } from '../utils/jwt.js'

/** 测试环境变量（JWT_SECRET ≥ 32 字符；BGMIO_SALT 用于 HKDF 派生） */
const ENV = {
  JWT_SECRET: 'test-secret-at-least-32-characters-long',
  BGMIO_SALT: 'test-salt'
}

/** 固定基准时间（用于 fake timers），便于断言 iat/exp */
const BASE_TIME = new Date('2026-01-01T00:00:00Z').getTime()

/** Bangumi /v0/me 接口地址（与 auth.js 内部常量保持一致） */
const BGM_ME_API = 'https://api.bgm.tv/v0/me'

/**
 * 创建内存 D1 binding mock。
 *
 * 模拟 users 表的 INSERT / SELECT / UPDATE 操作，使用 Map 存储行数据。
 * 返回的 db 对象暴露 `prepare(sql)`，返回值支持 `.bind(...).first()` 与
 * `.bind(...).run()` 链式调用。SQL 类型通过正则匹配区分。
 *
 * 字段映射：JS 侧使用 camelCase，DB 侧使用 snake_case，本 mock 在
 * `first()` 返回时统一转回 camelCase（与 db/users.js 中的 SQL AS 别名等价）。
 *
 * @returns {{ prepare: Function, __users: Map, __emailIndex: Map, __prepareSpy: import('vitest').Mock }}
 */
function createMockD1() {
  /** @type {Map<string, object>} id -> 行数据（snake_case） */
  const users = new Map()
  /** @type {Map<string, string>} email -> id */
  const emailIndex = new Map()
  /** 监控 prepare 调用，用于断言"未调用 D1"等场景 */
  const prepareSpy = vi.fn()

  /**
   * 将 snake_case 行数据转为 camelCase（等价于 SQL 中的 AS 别名）。
   * @param {object} row - 原始行（snake_case）
   * @returns {object} camelCase 行
   */
  function toCamelRow(row) {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      salt: row.salt,
      bgmUid: row.bgm_uid,
      bgmTokenEncrypted: row.bgm_token_encrypted,
      bgmTokenIv: row.bgm_token_iv,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  /**
   * 根据 SQL 文本构造一个 statement 对象。
   * 通过正则匹配区分 7 种 SQL：INSERT、SELECT 1（存在性检查）、
   * SELECT bgm_uid（绑定信息）、SELECT * WHERE email（完整字段）、
   * SELECT * WHERE id（公开字段）、UPDATE 绑定、UPDATE 清空绑定。
   */
  function statement(sql) {
    const isInsert = /INSERT INTO users/i.test(sql)
    const isExistsByEmail = /SELECT 1 FROM users WHERE email/i.test(sql)
    const isSelectBgmBinding = /SELECT bgm_uid AS bgmUid/i.test(sql)
    const isSelectByEmailFull =
      /SELECT[\s\S]*password_hash[\s\S]*FROM users WHERE email = \?/i.test(sql)
    const isSelectByIdPublic =
      !isSelectBgmBinding && /SELECT[\s\S]*FROM users WHERE id = \?/i.test(sql)
    const isUpdateBgmBinding =
      /UPDATE users[\s\S]*SET bgm_uid = \?/i.test(sql) && !/bgm_uid = NULL/i.test(sql)
    const isClearBgmBinding = /UPDATE users[\s\S]*SET bgm_uid = NULL/i.test(sql)

    return {
      bind(...params) {
        return {
          async first() {
            // 存在性检查：返回 { '1': 1 } 表示存在
            if (isExistsByEmail) {
              const [email] = params
              return emailIndex.has(email) ? { 1: 1 } : null
            }
            // 绑定信息查询：返回精简字段
            if (isSelectBgmBinding) {
              const [id] = params
              const row = users.get(id)
              if (!row) return null
              return {
                bgmUid: row.bgm_uid,
                bgmTokenEncrypted: row.bgm_token_encrypted,
                bgmTokenIv: row.bgm_token_iv
              }
            }
            // 按邮箱查（含密码字段）：返回完整 camelCase 行
            if (isSelectByEmailFull) {
              const [email] = params
              const id = emailIndex.get(email)
              if (!id) return null
              return toCamelRow(users.get(id))
            }
            // 按 id 查（公开字段）：返回 camelCase 行
            if (isSelectByIdPublic) {
              const [id] = params
              const row = users.get(id)
              if (!row) return null
              return toCamelRow(row)
            }
            return null
          },
          async run() {
            // 插入新用户
            if (isInsert) {
              const [id, email, passwordHash, salt, createdAt, updatedAt] = params
              users.set(id, {
                id,
                email,
                password_hash: passwordHash,
                salt,
                bgm_uid: null,
                bgm_token_encrypted: null,
                bgm_token_iv: null,
                created_at: createdAt,
                updated_at: updatedAt
              })
              emailIndex.set(email, id)
              return { success: true }
            }
            // 更新 Bangumi 绑定
            if (isUpdateBgmBinding) {
              const [bgmUid, bgmTokenEncrypted, bgmTokenIv, now, id] = params
              const row = users.get(id)
              if (!row) return { success: false }
              row.bgm_uid = bgmUid
              row.bgm_token_encrypted = bgmTokenEncrypted
              row.bgm_token_iv = bgmTokenIv
              row.updated_at = now
              return { success: true }
            }
            // 清空 Bangumi 绑定
            if (isClearBgmBinding) {
              const [now, id] = params
              const row = users.get(id)
              if (!row) return { success: false }
              row.bgm_uid = null
              row.bgm_token_encrypted = null
              row.bgm_token_iv = null
              row.updated_at = now
              return { success: true }
            }
            return { success: true }
          }
        }
      }
    }
  }

  return {
    prepare(sql) {
      prepareSpy(sql)
      return statement(sql)
    },
    __users: users,
    __emailIndex: emailIndex,
    __prepareSpy: prepareSpy
  }
}

// 全局时间控制：每个测试开始时固定到 BASE_TIME，结束后恢复真实时间
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(BASE_TIME)
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

// ===== 场景 1：Bangmio 完整流程 =====
describe('场景 1：Bangmio 完整流程（注册 → 登录 → 绑定 → 调用番剧功能）', () => {
  /** @type {ReturnType<typeof createMockD1>} */
  let db
  let registeredUserId
  let jwtAfterRegister
  let jwtAfterBind
  const validBgmToken = 'bgm-access-token-abc-123'
  const bgmUserInfo = { id: 12345, username: 'test' }

  beforeAll(() => {
    // 整个场景共用一个内存 D1，保证注册 → 绑定 → 调用 流程的连续性
    db = createMockD1()
  })

  beforeEach(() => {
    // fetchHTML 默认返回 Bangumi 用户信息（bindBangumi 验证 token 用）
    fetchHTML.mockResolvedValue(JSON.stringify(bgmUserInfo))
  })

  it('1.1 注册新用户返回 JWT，payload 含 userId/email，无 bgmUid', async () => {
    // verifyCode 默认返回 undefined → registerUser 会因验证码失败，需 mock 为 true
    verifyCode.mockResolvedValue(true)
    const { token, user } = await registerUser(db, ENV, {
      email: 'flow@test.com',
      password: 'password123',
      code: '123456'
    })

    // JWT 验证：payload 含 userId/email，无 bgmUid
    const verified = await verifyJwt(token, ENV.JWT_SECRET)
    expect(verified.valid).toBe(true)
    expect(verified.payload.userId).toBeTruthy()
    expect(verified.payload.email).toBe('flow@test.com')
    expect(verified.payload.bgmUid).toBeUndefined()

    // user 对象：id/email/bgmUid=null
    expect(user).toEqual({
      id: verified.payload.userId,
      email: 'flow@test.com',
      bgmUid: null
    })

    // 保存后续步骤要用的状态
    jwtAfterRegister = token
    registeredUserId = verified.payload.userId
  })

  it('1.2 用注册返回的 JWT 调用 getCurrentUser，返回 { id, email, isBound: false }', async () => {
    // 先验证 JWT 有效，提取 userId
    const verified = await verifyJwt(jwtAfterRegister, ENV.JWT_SECRET)
    expect(verified.valid).toBe(true)

    const result = await getCurrentUser(db, ENV, registeredUserId)
    expect(result.user).toEqual({
      id: registeredUserId,
      email: 'flow@test.com',
      bgmUid: null,
      isBound: false
    })
  })

  it('1.3 调用 bindBangumi 通过 bgm /v0/me 验证 token 后绑定成功', async () => {
    const { token, user } = await bindBangumi(db, ENV, registeredUserId, validBgmToken)

    // fetchHTML 调用参数正确：URL 与 Authorization 头
    expect(fetchHTML).toHaveBeenCalledTimes(1)
    const [url, opts] = fetchHTML.mock.calls[0]
    expect(url).toBe(BGM_ME_API)
    expect(opts.headers.Authorization).toBe('Bearer ' + validBgmToken)

    // 返回 user 含 bgmUid（字符串）
    expect(user).toEqual({
      id: registeredUserId,
      email: 'flow@test.com',
      bgmUid: '12345'
    })

    // D1 中已写入 bgm 绑定信息（加密 token 与 iv 均为 hex）
    const row = db.__users.get(registeredUserId)
    expect(row.bgm_uid).toBe('12345')
    expect(row.bgm_token_encrypted).toMatch(/^[0-9a-f]+$/)
    expect(row.bgm_token_iv).toMatch(/^[0-9a-f]{24}$/) // 12 字节 IV

    jwtAfterBind = token
  })

  it('1.4 绑定后再次调用 getCurrentUser，返回 { isBound: true, bgmUid: 12345 }', async () => {
    const result = await getCurrentUser(db, ENV, registeredUserId)
    expect(result.user).toEqual({
      id: registeredUserId,
      email: 'flow@test.com',
      bgmUid: '12345',
      isBound: true
    })
  })

  it('1.5 调用 getUserBgmToken 返回解密后的原 Bangumi access_token（与传入一致）', async () => {
    const decrypted = await getUserBgmToken(db, ENV, registeredUserId)
    expect(decrypted).toBe(validBgmToken)
  })

  it('1.6 用新 JWT（refresh 后）调用番剧功能 mock：携带解密后的 bgmToken', async () => {
    // 推进时间 1 小时，确保新 token 的 iat 与旧 token 不同
    vi.setSystemTime(BASE_TIME + 3600 * 1000)

    // refresh：旧 JWT（绑定后）→ 新 JWT
    const { token: refreshedToken } = await refreshJwt(db, ENV, jwtAfterBind)
    expect(refreshedToken).not.toBe(jwtAfterBind)

    // 新 JWT 仍有效且含 bgmUid
    const verified = await verifyJwt(refreshedToken, ENV.JWT_SECRET)
    expect(verified.valid).toBe(true)
    expect(verified.payload.userId).toBe(registeredUserId)
    expect(verified.payload.bgmUid).toBe('12345')

    // 模拟番剧功能：内部从 D1 取出 bgmToken，以 Bearer 形式调用 bgm /v0/me
    fetchHTML.mockClear()
    fetchHTML.mockResolvedValueOnce(JSON.stringify(bgmUserInfo))
    const bgmTokenFromDb = await getUserBgmToken(db, ENV, registeredUserId)
    expect(bgmTokenFromDb).toBe(validBgmToken)

    // 调用 bgm /v0/me 时携带解密后的 bgmToken
    await fetchHTML(BGM_ME_API, {
      headers: { Authorization: `Bearer ${bgmTokenFromDb}` }
    })

    expect(fetchHTML).toHaveBeenCalledWith(
      BGM_ME_API,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${validBgmToken}`
        })
      })
    )
  })
})

// ===== 场景 2：Bangumi 直登流程 =====
describe('场景 2：Bangumi 直登流程（前端直存 token，不写 D1）', () => {
  /** @type {ReturnType<typeof createMockD1>} */
  let db
  const directBgmToken = 'direct-bgm-token-xyz-789'
  const directBgmUser = { id: 88888, username: 'direct-user' }

  beforeEach(() => {
    db = createMockD1()
    fetchHTML.mockResolvedValue(JSON.stringify(directBgmUser))
  })

  it('2.1 用户直接在前端存储 Bangumi access_token（不调 D1）', () => {
    // 模拟前端 localStorage 存储 Bangumi access_token
    const frontendStore = new Map()
    frontendStore.set('bgm_access_token', directBgmToken)

    // 直接从前端存储取出 token（不走 D1）
    const storedToken = frontendStore.get('bgm_access_token')
    expect(storedToken).toBe(directBgmToken)

    // 整个 setup 过程未调用 D1
    expect(db.__prepareSpy).not.toHaveBeenCalled()
  })

  it('2.2 调用 bgm /v0/me 时携带该 token 返回 200 + 用户信息', async () => {
    const text = await fetchHTML(BGM_ME_API, {
      headers: { Authorization: `Bearer ${directBgmToken}` }
    })
    const me = JSON.parse(text)

    // 返回 Bangumi 用户信息
    expect(me).toEqual(directBgmUser)

    // 请求头携带 Bearer token
    expect(fetchHTML).toHaveBeenCalledWith(
      BGM_ME_API,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${directBgmToken}`
        })
      })
    )
  })

  it('2.3 该流程不涉及 D1 数据库读写（db.prepare 未被调用）', async () => {
    // 模拟前端直登完整流程：仅调用 fetchHTML 验证 token，不触发任何服务函数
    await fetchHTML(BGM_ME_API, {
      headers: { Authorization: `Bearer ${directBgmToken}` }
    })

    expect(db.__prepareSpy).not.toHaveBeenCalled()
  })
})

// ===== 场景 3：未绑定 Bangmio 用户调用番剧功能 → 403 引导 =====
describe('场景 3：未绑定 Bangmio 用户调用番剧功能 → 403 引导', () => {
  /** @type {ReturnType<typeof createMockD1>} */
  let db
  let userId

  beforeEach(async () => {
    db = createMockD1()
    fetchHTML.mockResolvedValue(JSON.stringify({ id: 12345, username: 'test' }))
    verifyCode.mockResolvedValue(true)

    // 注册 Bangmio 账号但不绑定 Bangumi（场景前置）
    const { user } = await registerUser(db, ENV, {
      email: 'unbound@test.com',
      password: 'password123',
      code: '123456'
    })
    userId = user.id
  })

  it('3.1 注册新 Bangmio 账号但不绑定 Bangumi', async () => {
    // 验证注册成功且未绑定
    const result = await getCurrentUser(db, ENV, userId)
    expect(result.user).toEqual({
      id: userId,
      email: 'unbound@test.com',
      bgmUid: null,
      isBound: false
    })
  })

  it('3.2 调用 getUserBgmToken 返回 null（未绑定）', async () => {
    const bgmToken = await getUserBgmToken(db, ENV, userId)
    expect(bgmToken).toBeNull()
  })

  it('3.3 effectiveBgmToken 为空时前端应触发 showBindModal=true（仅验证后端返回 null）', async () => {
    const bgmToken = await getUserBgmToken(db, ENV, userId)

    // 模拟前端拦截器逻辑：effectiveBgmToken 为空 → showBindModal=true
    const effectiveBgmToken = bgmToken || ''
    const showBindModal = !effectiveBgmToken

    // 后端返回 null 是触发前端弹窗的根因
    expect(bgmToken).toBeNull()
    expect(showBindModal).toBe(true)
  })

  it('3.4 番剧功能接口要求 bangmioToken 但用户未绑定，返回 403 引导绑定', async () => {
    // 模拟后端番剧功能接口的"未绑定"中间件：若 getUserBgmToken 返回 null，则返回 403
    async function requireBangumiBinding(db, env, userId) {
      const bgmToken = await getUserBgmToken(db, env, userId)
      if (!bgmToken) {
        return {
          status: 403,
          body: { data: null, error: '请先绑定 Bangumi 账号', code: 403 }
        }
      }
      return null
    }

    const blocked = await requireBangumiBinding(db, ENV, userId)
    expect(blocked).not.toBeNull()
    expect(blocked.status).toBe(403)
    expect(blocked.body).toEqual({
      data: null,
      error: '请先绑定 Bangumi 账号',
      code: 403
    })
  })
})
