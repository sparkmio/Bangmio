'use client'
import { useEffect, useState } from 'react'
import { formatEpisodeDuration } from '@/lib/collection-options'
export type Episode = {
  id?: number
  sort?: number
  name?: string
  name_cn?: string
  airdate?: string
  duration?: string
  duration_seconds?: number
}
const limit = 100

export function EpisodeList({
  subjectId,
  initialEpisodes,
  initialTotal,
  initialFailed = false
}: {
  subjectId: number
  initialEpisodes: Episode[]
  initialTotal: number
  initialFailed?: boolean
}) {
  const [offset, setOffset] = useState(0)
  const [episodes, setEpisodes] = useState(initialEpisodes)
  const [total, setTotal] = useState(initialTotal)
  const [error, setError] = useState(initialFailed ? '章节加载失败，请重试' : '')
  const [loading, setLoading] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (offset === 0 && retry === 0) return
    const controller = new AbortController()
    setLoading(true)
    setError('')
    void fetch(`/api/v1/anime/${subjectId}/episodes?offset=${offset}&limit=${limit}`, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25000)])
    })
      .then(async response => {
        const payload = await response.json()
        if (!response.ok || !Array.isArray(payload.data)) throw new Error('章节加载失败')
        if (controller.signal.aborted) return
        setEpisodes(payload.data)
        setTotal(Number(payload.total || 0))
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('章节加载失败，请重试')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [offset, retry, subjectId])

  const go = (next: number) => {
    if (next === 0) {
      setEpisodes(initialEpisodes)
      setTotal(initialTotal)
      setError(initialFailed ? '章节加载失败，请重试' : '')
      setLoading(false)
    }
    setOffset(next)
  }
  return (
    <section aria-label="章节列表">
      <h2 className="text-lg font-semibold mb-3">章节</h2>
      {loading ? (
        <p role="status">正在加载章节…</p>
      ) : error ? (
        <div role="alert">
          <p>{error}</p>
          <button type="button" className="btn btn-sm" onClick={() => setRetry(value => value + 1)}>
            重试章节
          </button>
        </div>
      ) : episodes.length ? (
        <div className="divide-y divide-base-300 rounded-xl bg-base-200/30">
          {episodes.map((episode, index) => (
            <div className="flex items-center gap-4 p-3" key={episode.id || `${offset}-${index}`}>
              <span className="text-sm font-bold text-primary w-8">
                {String(episode.sort ?? offset + index + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  {episode.name_cn || episode.name || `第${episode.sort ?? offset + index + 1}话`}
                </p>
                <p className="text-xs text-base-content/50">{episode.airdate || '播出日期未知'}</p>
              </div>
              <span className="text-xs text-base-content/50">
                {episode.duration ||
                  (episode.duration_seconds ? formatEpisodeDuration(episode.duration_seconds) : '')}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p>暂无章节</p>
      )}
      {total > limit ? (
        <nav aria-label="章节分页" className="flex flex-wrap gap-3 items-center mt-4">
          <button
            type="button"
            className="btn btn-sm"
            disabled={offset === 0 || loading}
            onClick={() => go(Math.max(0, offset - limit))}
          >
            上一页章节
          </button>
          <span>
            第 {Math.floor(offset / limit) + 1} / {Math.ceil(total / limit)} 页 · 共 {total} 话
          </span>
          <button
            type="button"
            className="btn btn-sm"
            disabled={offset + limit >= total || loading}
            onClick={() => go(offset + limit)}
          >
            下一页章节
          </button>
        </nav>
      ) : null}
    </section>
  )
}
