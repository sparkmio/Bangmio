/**
 * 统一内存缓存工具（Cloudflare Pages / Hono 后端）。
 *
 * 基于 Map 存储，支持 TTL 过期。参考现有实现：
 * - groups.js: `const cache = new Map()` + `getCached(key)` + `setCache(key, data)` + `CACHE_TTL`
 * - comments.js: 同样的 Map + 时间戳模式
 *
 * 用法：
 *   const cache = createCache(5 * 60 * 1000, 500)
 *   cache.set('key', data)
 *   const data = cache.get('key')  // 过期返回 null
 *   cache.clear()
 */

/**
 * 创建一个带 TTL 的缓存实例。
 * @param {number} ttl - 缓存有效期（毫秒）。超过此时间的条目视为过期。
 * @param {number} [maxEntries=500] - 最大条目数，超出时淘汰最久未使用的条目。
 * @returns {{ get: (key: string) => any, set: (key: string, data: any) => void, delete: (key: string) => void, deleteByPrefix: (prefix: string) => void, clear: () => void }}
 *   返回包含读取、写入、删除和清空能力的缓存对象。
 */
export function createCache(ttl, maxEntries = 500) {
  /** @type {Map<string, { data: any, time: number }>} */
  const store = new Map()

  return {
    /**
     * 按 key 读取缓存数据。
     * 若 key 不存在或已过期返回 null，否则返回对应数据。
     * @param {string} key - 缓存键。
     * @returns {any} 缓存的数据，或 null。
     */
    get(key) {
      const entry = store.get(key)
      if (!entry) return null
      if (Date.now() - entry.time >= ttl) {
        store.delete(key)
        return null
      }
      // Map maintains insertion order, so moving a hit to the end gives us a
      // small LRU bound without a second data structure.
      store.delete(key)
      store.set(key, entry)
      return entry.data
    },

    /**
     * 存储数据并记录当前时间戳。
     * @param {string} key - 缓存键。
     * @param {any} data - 需要缓存的数据。
     * @returns {void}
     */
    set(key, data) {
      store.delete(key)
      store.set(key, { data, time: Date.now() })
      while (store.size > Math.max(1, maxEntries)) store.delete(store.keys().next().value)
    },

    delete(key) {
      store.delete(key)
    },

    deleteByPrefix(prefix) {
      for (const key of store.keys()) {
        if (key.startsWith(prefix)) store.delete(key)
      }
    },

    /**
     * 清空所有缓存条目。
     * @returns {void}
     */
    clear() {
      store.clear()
    }
  }
}
