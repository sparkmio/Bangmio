/**
 * 统一 HTTP 抓取工具（Cloudflare Pages / Hono 后端）。
 *
 * 使用原生 fetch API（CF Workers 支持），不依赖任何 Node.js 内置模块。
 * 参考现有实现：
 * - groups.js: fetchHTML(url, timeout) + fetchHTMLWithRetry(urls, timeout)
 * - comments.js / user.js: fetchHTML + SCRAPE_UA
 *
 * 用法：
 *   import { fetchHTML, fetchHTMLMulti, SCRAPE_UA } from '../utils/http.js'
 *   const html = await fetchHTML('https://bgm.tv/group/all')
 *   const { html, url } = await fetchHTMLMulti([url1, url2])
 */

import { logError } from './logger.js'

/**
 * 抓取页面时使用的 User-Agent。
 * 与现有路由（groups.js / comments.js / user.js）保持一致。
 * @type {string}
 */
export const SCRAPE_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

/**
 * 显式按 UTF-8 解码响应体；若出现替换字符或解码失败，则回退到 GBK/GB18030。
 * 解决部分上游站点（如萌娘百科）在 Cloudflare Workers 中被错误按 Latin1 解码导致中文乱码的问题。
 *
 * @param {Response} res - fetch 返回的 Response 对象。
 * @returns {Promise<string>} 解码后的字符串。
 */
async function decodeResponseBody(res) {
  const buffer = await res.arrayBuffer()

  // 优先尝试 UTF-8；若包含 U+FFFD 替换字符，说明编码不对，继续尝试其他编码
  let text = ''
  try {
    text = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
    if (!text.includes('\uFFFD')) return text
  } catch {
    // UTF-8 解码异常时继续回退
  }

  // 回退到 GB18030 / GBK（CF Workers 的 TextDecoder 通常支持这些 label）
  for (const label of ['gb18030', 'gbk']) {
    try {
      const decoder = new TextDecoder(label, { fatal: true })
      return decoder.decode(buffer)
    } catch {
      // 当前 label 不支持或解码失败，继续下一个
    }
  }

  // 最终回退：按 UTF-8 非致命解码返回
  return new TextDecoder('utf-8').decode(buffer)
}

/**
 * 抓取指定 URL 的 HTML 内容。
 * 使用 AbortController 实现超时控制，失败时抛出错误并记录日志。
 *
 * @param {string} url - 要抓取的 URL。
 * @param {{ timeout?: number, headers?: Record<string, string> }} [opts]
 *   - timeout: 超时时间（毫秒），默认 8000。
 *   - headers: 自定义请求头，会与默认请求头合并（传入的优先）。
 * @returns {Promise<string>} HTML 文本内容。
 * @throws {Error} 当请求失败、超时或 HTTP 状态非 2xx 时抛出错误。
 */
export async function fetchHTML(url, { timeout = 8000, headers = {} } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': SCRAPE_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        ...headers
      }
    })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await decodeResponseBody(res)
  } catch (e) {
    clearTimeout(timer)
    logError('fetchHTML failed', { url, error: String(e) })
    throw e
  }
}

/**
 * 并发尝试多个 URL，返回首个成功的结果。
 *
 * 特性：
 * - 所有候选源同时发起请求，取第一个成功响应，减少串行等待。
 * - 支持整体超时控制，避免单个源拖慢全局。
 * - 单个源失败时自动重试一次（默认 retries=1），重试失败才视为该源失败。
 * - 全部失败后抛出最后一个错误。
 *
 * @param {string[]} urls - 候选 URL 数组。
 * @param {{ timeout?: number, overallTimeout?: number, retries?: number }} [opts]
 *   - timeout: 单次请求超时时间（毫秒），默认 8000。
 *   - overallTimeout: 整体超时时间（毫秒），默认 12000。
 *   - retries: 单个源失败后的重试次数，默认 1。
 * @returns {Promise<{ html: string, url: string }>} 成功的 HTML 及对应 URL。
 * @throws {Error} 当所有 URL 均失败或整体超时时抛出错误。
 */
export async function fetchHTMLMulti(
  urls,
  { timeout = 8000, overallTimeout = 12000, retries = 1 } = {}
) {
  if (!urls || urls.length === 0) {
    throw new Error('All sources failed')
  }

  let lastErr

  const fetchOneWithRetry = async url => {
    for (let i = 0; i <= retries; i++) {
      try {
        const html = await fetchHTML(url, { timeout })
        if (html) return { html, url }
      } catch (e) {
        lastErr = e
        if (i === retries) throw e
      }
    }
    throw new Error('unreachable')
  }

  const promises = urls.map(url => fetchOneWithRetry(url))
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Overall timeout ${overallTimeout}ms`)), overallTimeout)
  })

  try {
    return await Promise.race([Promise.any(promises), timeoutPromise])
  } catch (e) {
    throw lastErr || e || new Error('All sources failed')
  }
}

/**
 * 移除字符串中的 HTML 标签。
 * 与现有 groups.js / user.js 的 stripTags 实现一致。
 *
 * @param {string} str - 输入字符串。
 * @returns {string} 移除标签并 trim 后的字符串。
 */
export function stripTags(str) {
  return (str || '').replace(/<[^>]+>/g, '').trim()
}

/**
 * 反转义 HTML 实体。
 * 与现有 groups.js 的 unescapeHtml 实现一致（含空白折叠）。
 *
 * @param {string} str - 输入字符串。
 * @returns {string} 反转义并 trim 后的字符串。
 */
export function unescapeHtml(str) {
  return (str || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 解析数字。从字符串中提取所有数字字符并转为整数。
 * 与现有 groups.js 的 parseNumber 实现一致。
 *
 * @param {string|number|null|undefined} str - 输入值。
 * @returns {number} 解析后的整数，失败返回 0。
 */
export function parseNumber(str) {
  if (str == null) return 0
  const m = String(str).replace(/[^0-9]/g, '')
  const n = parseInt(m)
  return isNaN(n) ? 0 : n
}

/**
 * 修复相对 URL 为绝对 URL。
 * 与现有 groups.js / user.js 的 fixUrl 实现一致。
 *
 * - 以 `//` 开头：补全 `https:` 前缀。
 * - 以 `/` 开头：拼接 base 前缀。
 * - 其他：原样返回。
 *
 * @param {string} url - 输入 URL。
 * @param {string} [base=''] - 站点根 URL，用于补全 `/path` 形式的相对路径。
 * @returns {string} 修复后的绝对 URL，输入为空时返回空字符串。
 */
export function fixUrl(url, base = '') {
  if (!url) return ''
  if (url.startsWith('//')) return `https:${url}`
  if (url.startsWith('/')) return `${base}${url}`
  return url
}
