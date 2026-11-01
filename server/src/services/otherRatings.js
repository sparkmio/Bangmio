import { parseHTML } from 'linkedom'
import { createCache } from '../utils/cache.js'
import { logWarn } from '../utils/logger.js'

const FRESH_TTL = 6 * 60 * 60 * 1000
const STALE_TTL = 7 * 24 * 60 * 60 * 1000
const freshCache = createCache(FRESH_TTL, 500)
const staleCache = createCache(STALE_TTL, 500)
const searchCache = createCache(FRESH_TTL, 500)

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

function normalizeTitle(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[\p{P}\p{S}\s]/gu, '')
}

function candidateTitles(item) {
  return [
    item?.title,
    item?.title_english,
    item?.title_japanese,
    ...(Array.isArray(item?.title_synonyms) ? item.title_synonyms : []),
    ...(Array.isArray(item?.titles) ? item.titles.map(title => title?.title) : [])
  ]
    .map(normalizeTitle)
    .filter(Boolean)
}

function candidateYear(item) {
  const value = String(item?.year || item?.aired?.from || item?.release_year || '')
  return Number(value.match(/(?:19|20)\d{2}/)?.[0]) || 0
}

function exactTitleMatch(item, titles, year) {
  const knownTitles = candidateTitles(item)
  const titleIndex = titles.findIndex(title => knownTitles.includes(normalizeTitle(title)))
  if (titleIndex < 0) return null
  const candidateYearValue = candidateYear(item)
  const targetYear = Number(year) || 0
  const yearDistance =
    targetYear && candidateYearValue
      ? Math.abs(targetYear - candidateYearValue)
      : targetYear
        ? 1000
        : 0
  return { item, titleIndex, yearDistance }
}

function chooseExactTitleMatch(items, titles, year) {
  return (Array.isArray(items) ? items : [])
    .map(item => exactTitleMatch(item, titles, year))
    .filter(Boolean)
    .filter(match => !Number(year) || !candidateYear(match.item) || match.yearDistance <= 3)
    .sort((a, b) => a.yearDistance - b.yearDistance || a.titleIndex - b.titleIndex)[0]?.item
}

function searchKey(provider, titles, year) {
  return `${provider}:${Number(year) || ''}:${titles.map(normalizeTitle).join('|')}`
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

async function getMalRatingByTitle(titles, year) {
  if (!titles.length) return { data: null, degraded: false }
  const key = searchKey('mal', titles, year)
  const cached = searchCache.get(key)
  if (cached) return cached.notFound ? { data: null, degraded: false } : cached

  const startedAt = Date.now()
  try {
    for (const title of titles.slice(0, 3)) {
      const params = new URLSearchParams({ q: title, limit: '10', sfw: 'true' })
      const response = await fetch(`https://api.jikan.moe/v4/anime?${params}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000)
      })
      if (!response.ok)
        throw Object.assign(new Error('MAL title search failed'), { status: response.status })
      const payload = await response.json()
      const match = chooseExactTitleMatch(payload?.data, titles, year)
      if (!match) continue
      const id = String(match.mal_id || '')
      const result = {
        data: id
          ? {
              id,
              score: numericScore(match.score),
              votes: ratingCount(match.scored_by),
              url: match.url || `https://myanimelist.net/anime/${id}`
            }
          : null,
        degraded: false
      }
      if (result.data) {
        freshCache.set(`MyAnimeList:${id}`, result.data)
        staleCache.set(`MyAnimeList:${id}`, result.data)
        staleCache.set(`MyAnimeList:search:${key}`, result.data)
      }
      searchCache.set(key, result.data ? result : { notFound: true })
      return result
    }
    searchCache.set(key, { notFound: true })
    return { data: null, degraded: false }
  } catch (error) {
    logWarn('外部评分源标题检索失败', {
      source: 'MyAnimeList',
      upstreamStatus: error?.status,
      errorName: error?.name,
      causeName: error?.cause?.name,
      durationMs: Date.now() - startedAt
    })
    return { data: staleCache.get(`MyAnimeList:search:${key}`), degraded: true }
  }
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

function imdbSearchCandidates(html) {
  const { document } = parseHTML(html)
  const candidates = []
  for (const anchor of document.querySelectorAll('a[href]')) {
    const href = anchor.getAttribute('href') || ''
    const id = href.match(/(?:imdb\.com)?\/title\/(tt\d{5,12})(?:\/|\?|$)/i)?.[1]
    const title = (anchor.textContent || '')
      .trim()
      .replace(/\s*\((?:19|20)\d{2}(?:[–-](?:19|20)?\d{2})?\)\s*$/, '')
    if (!id || !title) continue
    const containerText = anchor.parentElement?.textContent || anchor.textContent || ''
    candidates.push({
      id: id.toLowerCase(),
      title,
      year: Number(containerText.match(/(?:19|20)\d{2}/)?.[0]) || 0
    })
  }
  return candidates
}

async function getImdbIdByTitle(titles, year) {
  if (!titles.length) return ''
  const key = searchKey('imdb', titles, year)
  const cached = searchCache.get(key)
  if (cached) return cached.id || ''

  for (const title of titles.slice(0, 3)) {
    const params = new URLSearchParams({ q: title, s: 'tt', exact: 'true' })
    const response = await fetch(`https://www.imdb.com/find/?${params}`, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (compatible; Bangmio/1.0)'
      },
      signal: AbortSignal.timeout(5000)
    })
    if (!response.ok)
      throw Object.assign(new Error('IMDb title search failed'), { status: response.status })
    const match = chooseExactTitleMatch(imdbSearchCandidates(await response.text()), titles, year)
    if (!match) continue
    searchCache.set(key, { id: match.id })
    return match.id
  }
  searchCache.set(key, { notFound: true })
  return ''
}

async function getImdbRatingByTitle(titles, year) {
  const startedAt = Date.now()
  try {
    const id = await getImdbIdByTitle(titles, year)
    if (!id) return { data: null, degraded: false }
    return getImdbRating(id)
  } catch (error) {
    logWarn('外部评分源标题检索失败', {
      source: 'IMDb',
      upstreamStatus: error?.status,
      errorName: error?.name,
      causeName: error?.cause?.name,
      durationMs: Date.now() - startedAt
    })
    return { data: null, degraded: true }
  }
}

async function getRatingWithTitleFallback(id, titles, year, loadById, loadByTitle) {
  if (!id) return loadByTitle(titles, year)
  const linked = await loadById(id)
  if (linked.data || !titles.length) return linked

  const searched = await loadByTitle(titles, year)
  return {
    data: searched.data || linked.data || null,
    degraded: searched.degraded || (!searched.data && linked.degraded)
  }
}

export async function getOtherRatings({ malId = '', imdbId = '', titles = [], year = '' } = {}) {
  const searchTitles = [...new Set(titles.map(title => String(title || '').trim()).filter(Boolean))]
  const [mal, imdb] = await Promise.all([
    getRatingWithTitleFallback(malId, searchTitles, year, getMalRating, getMalRatingByTitle),
    getRatingWithTitleFallback(imdbId, searchTitles, year, getImdbRating, getImdbRatingByTitle)
  ])
  return {
    data: { mal: mal.data, imdb: imdb.data },
    degraded: mal.degraded || imdb.degraded,
    degradedSources: { mal: mal.degraded, imdb: imdb.degraded }
  }
}

export { findAggregateRating, numericScore, ratingCount }
