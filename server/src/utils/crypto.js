/**
 * 密码与令牌加密工具（Cloudflare Pages / Hono 后端）。
 *
 * 完全基于 Web Crypto API（`globalThis.crypto`），不依赖 `node:crypto`，
 * 可在 Cloudflare Workers 与 Node 18+ 环境中运行。
 *
 * 提供：
 * - 用户密码哈希（PBKDF2-SHA256，100000 次迭代）
 * - Bangumi access_token 加密存储（AES-256-GCM + HKDF 派生密钥）
 *
 * 用法：
 *   import { generateSalt, hashPassword, verifyPassword, encryptToken, decryptToken } from '../utils/crypto.js'
 *   const salt = generateSalt()
 *   const hash = await hashPassword(password, salt)
 *   const ok = await verifyPassword(password, salt, hash)
 *   const { encrypted, iv } = await encryptToken(bgmToken, env.JWT_SECRET)
 *   const token = await decryptToken(encrypted, iv, env.JWT_SECRET)
 */

/** PBKDF2 迭代次数（NIST 建议 ≥ 100000） */
const PBKDF2_ITERATIONS = 100000

/** PBKDF2 派生位数（256 bit） */
const PBKDF2_KEY_BITS = 256

/** AES-GCM IV 长度（12 字节，NIST 推荐值） */
const AES_GCM_IV_BYTES = 12

/** HKDF info（用于派生 AES 密钥的上下文标签，做域分离） */
const HKDF_INFO = 'bangmio-token-encryption'

/**
 * ArrayBuffer 转 hex 字符串。
 * @param {ArrayBuffer|Uint8Array} buffer - 输入缓冲区。
 * @returns {string} 小写 hex 字符串。
 */
export function bufferToHex(buffer) {
  const bytes = new Uint8Array(buffer)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}

/**
 * hex 字符串转 ArrayBuffer。
 * @param {string} hex - hex 字符串（长度必须为偶数）。
 * @returns {ArrayBuffer} 对应的字节缓冲区。
 */
export function hexToBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes.buffer
}

/**
 * 生成 16 字节随机 salt。
 * 使用 `crypto.getRandomValues` 生成密码学安全的随机字节。
 * @returns {string} 32 字符的 hex 字符串。
 */
export function generateSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return bufferToHex(bytes.buffer)
}

/**
 * 使用 PBKDF2-SHA256 哈希密码。
 * 迭代 100000 次，输出 256 bit 的 hex 字符串。
 *
 * @param {string} password - 用户原始密码。
 * @param {string} saltHex - `generateSalt()` 产生的 hex salt。
 * @returns {Promise<string>} 64 字符的 hex 哈希字符串。
 */
export async function hashPassword(password, saltHex) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits'
  ])
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: hexToBuffer(saltHex),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    PBKDF2_KEY_BITS
  )
  return bufferToHex(bits)
}

/**
 * 常量时间字符串比较，防止时序攻击。
 * @param {string} a - 字符串 A。
 * @param {string} b - 字符串 B。
 * @returns {boolean} 是否相等。
 */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

/**
 * 验证密码是否与已存储的哈希匹配。
 * 内部使用常量时间比较以防止时序攻击。
 *
 * @param {string} password - 用户输入的密码。
 * @param {string} saltHex - 存储的 hex salt。
 * @param {string} hashHex - 存储的 hex 哈希。
 * @returns {Promise<boolean>} 匹配返回 true，否则 false。
 */
export async function verifyPassword(password, saltHex, hashHex) {
  const computed = await hashPassword(password, saltHex)
  return timingSafeEqual(computed, hashHex)
}

/**
 * 通过 HKDF-SHA256 从主密钥派生 AES-256 密钥。
 * 派生出的密钥不可导出（`extractable: false`），仅用于 AES-GCM 加解密。
 *
 * @param {string} secret - 主密钥（建议使用 JWT_SECRET）。
 * @param {string} saltHex - HKDF salt（建议使用全局 BGMIO_SALT）。
 * @returns {Promise<CryptoKey>} AES-256-GCM 的 CryptoKey。
 */
export async function deriveKey(secret, saltHex) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(secret), 'HKDF', false, [
    'deriveKey'
  ])
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      salt: hexToBuffer(saltHex),
      info: enc.encode(HKDF_INFO),
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * 从主密钥确定性派生固定 salt（SHA-256(secret) 的 hex）。
 * 用于 `encryptToken` / `decryptToken` 在不额外存储 salt 的前提下复现 HKDF 派生。
 * @param {string} secret - 主密钥。
 * @returns {Promise<string>} 64 字符 hex salt。
 */
async function deriveSaltFromSecret(secret) {
  const enc = new TextEncoder()
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(secret))
  return bufferToHex(digest)
}

/**
 * 使用 AES-256-GCM 加密 Bangumi access_token。
 *
 * 密钥通过 HKDF 从 `secret` 派生（salt 为 SHA-256(secret) 的 hex，
 * 无需额外存储）。IV 每次随机生成并随密文一起返回，需一并持久化到
 * `users.bgm_token_iv` 列。
 *
 * @param {string} token - 明文 access_token。
 * @param {string} secret - 主密钥（建议使用 JWT_SECRET）。
 * @returns {Promise<{ encrypted: string, iv: string }>} `{ encrypted, iv }` 均为 hex 字符串。
 */
export async function encryptToken(token, secret) {
  const saltHex = await deriveSaltFromSecret(secret)
  const key = await deriveKey(secret, saltHex)
  const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_BYTES))
  const enc = new TextEncoder()
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(token))
  return { encrypted: bufferToHex(ciphertext), iv: bufferToHex(iv.buffer) }
}

/**
 * 使用 AES-256-GCM 解密 Bangumi access_token。
 *
 * @param {string} encryptedHex - `encryptToken` 返回的 encrypted hex。
 * @param {string} ivHex - `encryptToken` 返回的 iv hex。
 * @param {string} secret - 主密钥（必须与加密时一致）。
 * @returns {Promise<string>} 明文 access_token。
 * @throws {Error} 当密钥/IV 不匹配或密文损坏时抛出（AES-GCM 校验失败）。
 */
export async function decryptToken(encryptedHex, ivHex, secret) {
  const saltHex = await deriveSaltFromSecret(secret)
  const key = await deriveKey(secret, saltHex)
  const dec = new TextDecoder()
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: hexToBuffer(ivHex) },
    key,
    hexToBuffer(encryptedHex)
  )
  return dec.decode(plaintext)
}
