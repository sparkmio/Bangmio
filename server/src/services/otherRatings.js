import { parseHTML } from 'linkedom'
import { createCache } from '../utils/cache.js'
import { logWarn } from '../utils/logger.js'

const FRESH_TTL = 6 * 60 * 60 * 1000
const STALE_TTL = 7 * 24 * 60 * 60 * 1000
const freshCache = createCache(FRESH_TTL, 500)
const staleCache = createCache(STALE_TTL, 500)

function ratingCount(value) {
  if (value == null || String(value).trim() === '') return null
  const count = Number(String(value ?? '').replace(/,/g, ''))
  return Number.isSafeInteger(count) && count >= 0 ? count : null
}

function numericScore(value) {
  if (value == null || String(value).trim() === '') return null
  const score = Number(value)
  return Number.isFinite(score) && score >= 0 && score <= 10 ? score : null
}

function findAggregateRating(value) {
  if (!value || typeof value !== 'object') return null
  if (Array.isArray(value)) {
    for (const item of value) {
      const result = findAggregateRating(item)
      if (result) return result
    }
    return null
  }
  if (value.aggregateRating && typeof value.aggregateRating === 'object')
    return value.aggregateRating
  if (String(value['@type'] || '').toLowerCase() === 'aggregaterating') return value
  for (const child of Object.values(value)) {
    const result = findAggregateRating(child)
    if (result) return result
  }
  return null
}

async function cachedRating({ source, id, url, load }) {
  const key = `${source}:${id}`
  const fresh = freshCache.get(key)
  if (fresh) return { data: fresh, degraded: false }

  const startedAt = Date.now()
  try {
    const data = await load()
    freshCache.set(key, data)
    staleCache.set(key, data)
    return { data, degraded: false }
  } catch (error) {
    logWarn('外部评分源请求失败', {
      source,
      upstreamStatus: error?.status,
      errorName: error?.name,
      causeName: error?.cause?.name,
      durationMs: Date.now() - startedAt
    })
    return { data: staleCache.get(key), degraded: true, url }
  }
}

async function getMalRating(id) {
  const url = `https://myanimelist.net/anime/${id}`
  return cachedRating({
    source: 'MyAnimeList',
    id,
    url,
    load: async () => {
      const response = await fetch(`https://api.jikan.moe/v4/anime/${id}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000)
      })
      if (!response.ok)
        throw Object.assign(new Error('MAL rating request failed'), { status: response.status })
      const payload = await response.json()
      const score = numericScore(payload?.data?.score)
      return {
        id,
        score,
        votes: ratingCount(payload?.data?.scored_by),
        url: payload?.data?.url || url
      }
    }
  })
}

async function getImdbRating(id) {
  const url = `https://www.imdb.com/title/${id}/`
  return cachedRating({
    source: 'IMDb',
    id,
    url,
    load: async () => {
      const response = await fetch(url, {
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'Mozilla/5.0 (compatible; Bangmio/1.0)'
        },
        signal: AbortSignal.timeout(5000)
      })
      if (!response.ok)
        throw Object.assign(new Error('IMDb rating request failed'), { status: response.status })
      const { document } = parseHTML(await response.text())
      let aggregateRating = null
      for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
          aggregateRating = findAggregateRating(JSON.parse(script.textContent || ''))
        } catch {
          // Skip unrelated or malformed JSON-LD blocks.
        }
        if (aggregateRating) break
      }
      const score = numericScore(aggregateRating?.ratingValue)
      if (score === null) throw new Error('IMDb rating missing from structured data')
      return {
        id,
        score,
        votes: ratingCount(aggregateRating?.ratingCount || aggregateRating?.reviewCount),
        url
      }
    }
  })
}

export async function getOtherRatings({ malId = '', imdbId = '' } = {}) {
  const [mal, imdb] = await Promise.all([
    malId ? getMalRating(malId) : Promise.resolve({ data: null, degraded: false }),
    imdbId ? getImdbRating(imdbId) : Promise.resolve({ data: null, degraded: false })
  ])
  return {
    data: { mal: mal.data, imdb: imdb.data },
    degraded: mal.degraded || imdb.degraded
  }
}

export { findAggregateRating, numericScore, ratingCount }
