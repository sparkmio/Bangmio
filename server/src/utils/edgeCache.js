/**
 * Cloudflare Cache API 边缘缓存工具。
 *
 * Cache API 在 CF 边缘跨实例共享（区别于路由内的内存 Map 缓存），
 * 适合缓存外部站点代理产出的 HTML（清洗页/降级卡片等），减少上游请求与用户等待。
 * 本地 node 环境无 caches 全局对象，自动降级为不缓存。
 */

const CACHE_NAMESPACE = 'https://bangmio-cache.internal'

/**
 * 获取 Cache API 实例（非 CF 环境返回 null）。
 * @returns {Cache | null}
 */
export function getEdgeCache() {
  return typeof caches !== 'undefined' ? caches.default : null
}

/**
 * 读取缓存 HTML。
 * @param {string} key - 缓存键（如 'douban/page/35366293'）。
 * @returns {Promise<string | null>} 命中返回 HTML 文本，未命中/异常返回 null。
 */
export async function edgeCacheGet(key) {
  const cache = getEdgeCache()
  if (!cache) return null
  try {
    const res = await cache.match(`${CACHE_NAMESPACE}/${key}`)
    if (!res) return null
    const text = await res.text()
    return text || null
  } catch {
    return null
  }
}

/**
 * 写入缓存 HTML（带 Cache-Control TTL）。
 * @param {string} key - 缓存键。
 * @param {string} html - HTML 内容。
 * @param {number} [maxAge=600] - 缓存秒数，默认 10 分钟。
 * @returns {Promise<void>}
 */
export async function edgeCachePut(key, html, maxAge = 600) {
  const cache = getEdgeCache()
  if (!cache || !html) return
  try {
    await cache.put(
      `${CACHE_NAMESPACE}/${key}`,
      new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': `max-age=${maxAge}`
        }
      })
    )
  } catch {
    // 写入失败不影响主流程
  }
}
