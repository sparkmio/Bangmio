/**
 * 用户数据访问层（Cloudflare D1）。
 *
 * 所有函数的第一个参数均为 D1 binding（即 `c.env.DB`，类型 `D1Database`），
 * 通过 `db.prepare(sql).bind(...)` 进行参数化查询以防 SQL 注入。
 *
 * 数据库表结构见 `server/db/schema.sql`：
 *   users(id, email, password_hash, salt, bgm_uid, bgm_token_encrypted,
 *         bgm_token_iv, created_at, updated_at)
 *
 * JS 侧统一使用 camelCase 字段名（id、email、passwordHash、salt、bgmUid、
 * bgmTokenEncrypted、bgmTokenIv、createdAt、updatedAt），通过 SQL `AS` 别名映射。
 *
 * 错误处理约定：
 * - 读操作（getXxx/userExistsByEmail）：捕获 D1 异常后返回 null / false，便于上层
 *   以“未找到”分支处理，避免单次查询异常直接击穿请求。
 * - 写操作（createUser/updateUserBgmBinding/clearUserBgmBinding）：D1 异常或
 *   `result.success === false` 时抛出带上下文的 Error，由调用方决定如何回滚 / 响应。
 *
 * 用法：
 *   import { createUser, getUserByEmail } from '../db/users.js'
 *   const user = await createUser(c.env.DB, { id, email, passwordHash, salt })
 *   const found = await getUserByEmail(c.env.DB, email)
 */

/** 用户表完整列的 camelCase 别名 SELECT 片段（含 password_hash、salt、token）。 */
const USER_COLUMNS_FULL = `
  id,
  email,
  password_hash AS passwordHash,
  salt,
  bgm_uid AS bgmUid,
  bgm_token_encrypted AS bgmTokenEncrypted,
  bgm_token_iv AS bgmTokenIv,
  created_at AS createdAt,
  updated_at AS updatedAt
`

/** 用户表公开列的 camelCase 别名 SELECT 片段（不含 password_hash、salt、token）。 */
const USER_COLUMNS_PUBLIC = `
  id,
  email,
  bgm_uid AS bgmUid,
  created_at AS createdAt,
  updated_at AS updatedAt
`

/**
 * 创建新用户。
 *
 * `created_at` 与 `updated_at` 使用 `Date.now()` 写入。插入成功后回查并返回
 * 公开字段组成的用户对象（不含 password_hash、salt、token）。
 *
 * @param {D1Database} db - D1 binding（`c.env.DB`）。
 * @param {{ id: string, email: string, passwordHash: string, salt: string }} input
 *   用户基本信息。
 * @returns {Promise<{ id: string, email: string, bgmUid: string|null, createdAt: number, updatedAt: number }>}
 *   创建成功的用户对象（不含敏感字段）。
 * @throws {Error} 当 D1 写入失败（如 email 唯一约束冲突）或写入后回查失败时抛出。
 */
export async function createUser(db, { id, email, passwordHash, salt }) {
  const now = Date.now()
  try {
    const result = await db
      .prepare(
        `INSERT INTO users
           (id, email, password_hash, salt, bgm_uid, bgm_token_encrypted, bgm_token_iv, created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, NULL, NULL, ?, ?)`
      )
      .bind(id, email, passwordHash, salt, now, now)
      .run()
    if (!result.success) {
      throw new Error('D1 run() 返回 success=false')
    }
  } catch (err) {
    throw new Error(`createUser: 写入失败 (email=${email})`, { cause: err })
  }
  const created = await getUserById(db, id)
  if (!created) {
    throw new Error(`createUser: 写入后回查失败 (id=${id})`)
  }
  return created
}

/**
 * 根据邮箱查询用户（含 password_hash 与 salt，用于密码校验）。
 *
 * @param {D1Database} db - D1 binding（`c.env.DB`）。
 * @param {string} email - 用户邮箱。
 * @returns {Promise<object|null>}
 *   完整用户记录（含 passwordHash、salt、bgmTokenEncrypted、bgmTokenIv）或 null
 *   （用户不存在或查询异常）。
 */
export async function getUserByEmail(db, email) {
  try {
    const row = await db
      .prepare(`SELECT ${USER_COLUMNS_FULL} FROM users WHERE email = ?`)
      .bind(email)
      .first()
    return row || null
  } catch {
    return null
  }
}

/**
 * 根据 id 查询用户（不含 password_hash、salt、token）。
 *
 * @param {D1Database} db - D1 binding（`c.env.DB`）。
 * @param {string} id - 用户 ID。
 * @returns {Promise<{ id: string, email: string, bgmUid: string|null, createdAt: number, updatedAt: number }|null>}
 *   用户对象（不含敏感字段）或 null（用户不存在或查询异常）。
 */
export async function getUserById(db, id) {
  try {
    const row = await db
      .prepare(`SELECT ${USER_COLUMNS_PUBLIC} FROM users WHERE id = ?`)
      .bind(id)
      .first()
    return row || null
  } catch {
    return null
  }
}

/**
 * 更新用户的 Bangumi 绑定信息（bgm_uid + 加密 token + iv）。
 *
 * @param {D1Database} db - D1 binding（`c.env.DB`）。
 * @param {string} id - 用户 ID。
 * @param {string} bgmUid - Bangumi 用户 ID。
 * @param {string} bgmTokenEncrypted - 加密后的 access_token（hex）。
 * @param {string} bgmTokenIv - 加密使用的 IV（hex）。
 * @returns {Promise<{ id: string, email: string, bgmUid: string|null, createdAt: number, updatedAt: number }|null>}
 *   更新后的用户对象（不含敏感字段）；若用户不存在返回 null。
 * @throws {Error} 当 D1 更新失败时抛出。
 */
export async function updateUserBgmBinding(db, id, bgmUid, bgmTokenEncrypted, bgmTokenIv) {
  const now = Date.now()
  try {
    const result = await db
      .prepare(
        `UPDATE users
           SET bgm_uid = ?, bgm_token_encrypted = ?, bgm_token_iv = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(bgmUid, bgmTokenEncrypted, bgmTokenIv, now, id)
      .run()
    if (!result.success) {
      throw new Error('D1 run() 返回 success=false')
    }
  } catch (err) {
    throw new Error(`updateUserBgmBinding: 更新失败 (id=${id})`, { cause: err })
  }
  return getUserById(db, id)
}

/**
 * 清除用户的 Bangumi 绑定（解绑）。
 *
 * 将 bgm_uid、bgm_token_encrypted、bgm_token_iv 置为 NULL，并刷新 updated_at。
 *
 * @param {D1Database} db - D1 binding（`c.env.DB`）。
 * @param {string} id - 用户 ID。
 * @returns {Promise<void>}
 * @throws {Error} 当 D1 更新失败时抛出。
 */
export async function clearUserBgmBinding(db, id) {
  const now = Date.now()
  try {
    const result = await db
      .prepare(
        `UPDATE users
           SET bgm_uid = NULL, bgm_token_encrypted = NULL, bgm_token_iv = NULL, updated_at = ?
         WHERE id = ?`
      )
      .bind(now, id)
      .run()
    if (!result.success) {
      throw new Error('D1 run() 返回 success=false')
    }
  } catch (err) {
    throw new Error(`clearUserBgmBinding: 更新失败 (id=${id})`, { cause: err })
  }
}

/**
 * 查询用户的 Bangumi 绑定信息。
 *
 * @param {D1Database} db - D1 binding（`c.env.DB`）。
 * @param {string} id - 用户 ID。
 * @returns {Promise<{ bgmUid: string|null, bgmTokenEncrypted: string|null, bgmTokenIv: string|null }|null>}
 *   绑定信息对象；用户不存在或查询异常时返回 null。
 */
export async function getUserBgmBinding(db, id) {
  try {
    const row = await db
      .prepare(
        `SELECT bgm_uid AS bgmUid,
                bgm_token_encrypted AS bgmTokenEncrypted,
                bgm_token_iv AS bgmTokenIv
           FROM users
          WHERE id = ?`
      )
      .bind(id)
      .first()
    if (!row) return null
    return {
      bgmUid: row.bgmUid,
      bgmTokenEncrypted: row.bgmTokenEncrypted,
      bgmTokenIv: row.bgmTokenIv
    }
  } catch {
    return null
  }
}

/**
 * 判断指定邮箱是否已注册。
 *
 * @param {D1Database} db - D1 binding（`c.env.DB`）。
 * @param {string} email - 待检查的邮箱。
 * @returns {Promise<boolean>} 已存在返回 true，不存在或查询异常返回 false。
 */
export async function userExistsByEmail(db, email) {
  try {
    const row = await db.prepare('SELECT 1 FROM users WHERE email = ? LIMIT 1').bind(email).first()
    return row !== null
  } catch {
    return false
  }
}
