import { describe, it, expect, beforeEach } from 'vitest'
import { createCache } from './cache.js'

describe('createCache', () => {
  let cache

  beforeEach(() => {
    cache = createCache(1000) // 1 秒 TTL
  })

  it('set 和 get 基本功能', () => {
    cache.set('key1', 'value1')
    expect(cache.get('key1')).toBe('value1')
  })

  it('get 不存在的 key 返回 null', () => {
    expect(cache.get('nonexistent')).toBeNull()
  })

  it('TTL 过期后返回 null', async () => {
    cache.set('key1', 'value1')
    // 等待超过 TTL
    await new Promise(resolve => setTimeout(resolve, 1100))
    expect(cache.get('key1')).toBeNull()
  })

  it('clear 清空所有缓存', () => {
    cache.set('key1', 'value1')
    cache.set('key2', 'value2')
    cache.clear()
    expect(cache.get('key1')).toBeNull()
    expect(cache.get('key2')).toBeNull()
  })

  it('存储对象类型数据', () => {
    const obj = { name: 'test', items: [1, 2, 3] }
    cache.set('objKey', obj)
    expect(cache.get('objKey')).toEqual(obj)
  })

  it('命中后更新 LRU 顺序，并淘汰最久未使用的条目', () => {
    cache = createCache(1000, 2)
    cache.set('old', 1)
    cache.set('recent', 2)
    expect(cache.get('old')).toBe(1)
    cache.set('new', 3)
    expect(cache.get('old')).toBe(1)
    expect(cache.get('recent')).toBeNull()
  })

  it('支持删除单项和按前缀失效', () => {
    cache.set('topic:1', 1)
    cache.set('topic:2', 2)
    cache.set('group:1', 3)
    cache.delete('topic:1')
    cache.deleteByPrefix('topic:')
    expect(cache.get('topic:1')).toBeNull()
    expect(cache.get('topic:2')).toBeNull()
    expect(cache.get('group:1')).toBe(3)
  })
})
