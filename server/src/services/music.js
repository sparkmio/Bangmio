/**
 * 网易云音乐搜索服务
 * 使用网易云公开搜索接口，返回候选曲目列表。
 * 失败时返回空数组，由调用方降级为搜索链接。
 */

import { logError } from '../utils/logger.js'

const NETEASE_BASE = 'https://music.163.com'

const NETEASE_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

/**
 * 从网易云搜索结果中规范化曲目信息。
 * @param {object} song - 网易云返回的单曲对象。
 * @returns {{ id: number, name: string, artists: string, cover: string }}
 */
function normalizeSong(song) {
  const artists = Array.isArray(song.artists)
    ? song.artists.map(a => a.name).join(' / ')
    : Array.isArray(song.ar)
      ? song.ar.map(a => a.name).join(' / ')
      : song.artist || '未知歌手'

  const cover = song.album?.picUrl || song.al?.picUrl || song.picUrl || ''

  return {
    id: Number(song.id),
    name: String(song.name || ''),
    artists,
    cover
  }
}

/**
 * 调用网易云搜索接口获取候选曲目。
 * @param {string} keyword - 搜索关键词。
 * @param {number} limit - 返回数量上限。
 * @returns {Promise<Array<{ id: number, name: string, artists: string, cover: string }>>}
 */
async function searchNetEaseOnce(keyword, limit = 10) {
  const params = new URLSearchParams({
    s: keyword,
    type: '1',
    offset: '0',
    total: 'true',
    limit: String(limit)
  })

  const url = `${NETEASE_BASE}/api/search/get/web?${params.toString()}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': NETEASE_UA,
        Referer: `${NETEASE_BASE}/`,
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      }
    })

    clearTimeout(timer)

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }

    const text = await res.text()
    let json
    try {
      json = JSON.parse(text)
    } catch {
      throw new Error('响应不是有效 JSON')
    }

    if (json.code !== 200) {
      throw new Error(`网易云返回 code=${json.code}`)
    }

    const songs = json.result?.songs || []
    return songs.map(normalizeSong)
  } catch (e) {
    clearTimeout(timer)
    throw e
  }
}

/**
 * 批量获取歌曲详情，补全专辑封面（搜索接口返回的 album 字段不含 picUrl）。
 * @param {Array<{ id: number, name: string, artists: string, cover: string }>} songs
 * @returns {Promise<Array<{ id: number, name: string, artists: string, cover: string }>>}
 */
async function enrichSongsWithCovers(songs) {
  if (!songs.length) return songs

  const ids = songs.map(s => s.id).join(',')
  const url = `${NETEASE_BASE}/api/song/detail?ids=[${ids}]`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': NETEASE_UA,
        Referer: `${NETEASE_BASE}/`,
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      }
    })

    clearTimeout(timer)

    if (!res.ok) return songs

    const json = await res.json()
    const details = json.songs || []
    const coverMap = new Map()
    for (const d of details) {
      const cover = d.album?.picUrl || d.al?.picUrl || ''
      if (cover) coverMap.set(Number(d.id), cover)
    }

    return songs.map(s => ({
      ...s,
      cover: coverMap.get(s.id) || s.cover
    }))
  } catch {
    clearTimeout(timer)
    return songs
  }
}

/**
 * 按名称搜索网易云音乐。
 * 优先使用公开 web 接口，并通过歌曲详情接口补全封面；失败时返回空数组。
 *
 * @param {string} keyword - 搜索关键词。
 * @param {number} limit - 返回数量上限，默认 10。
 * @returns {Promise<Array<{ id: number, name: string, artists: string, cover: string }>>}
 */
export async function searchNetEase(keyword, limit = 10) {
  if (!keyword || typeof keyword !== 'string') return []

  const q = keyword.trim()
  if (!q) return []

  try {
    const results = await searchNetEaseOnce(q, limit)
    if (results.length) {
      return await enrichSongsWithCovers(results)
    }
  } catch (e) {
    logError('网易云搜索失败', { keyword: q, error: String(e) })
  }

  return []
}
