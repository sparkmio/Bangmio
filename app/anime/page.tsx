'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  browseEndpoint,
  browseParams,
  parseBrowseQuery,
  type BrowseQuery
} from '@/lib/browse-query'
import { AnimeGrid } from '@/components/anime-card'
import { VueLoadingState } from '@/components/vue-loading-state'
import type { Subject } from '@/lib/types'

type Tag = { name?: string; count?: number }
const typeOptions = [
  { label: '全部', value: 0 },
  { label: '动画', value: 2 },
  { label: '书籍', value: 1 },
  { label: '音乐', value: 3 },
  { label: '游戏', value: 4 },
  { label: '三次元', value: 6 }
]
const limit = 20

export default function AnimeBrowsePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // The URL is the committed query; the input remains a separate, unsent draft.
  const queryString = searchParams.toString()
  const query = useMemo(() => parseBrowseQuery(new URLSearchParams(queryString)), [queryString])
  const { page, type: filterType, tags: selectedTags } = query
  const [keyword, setKeyword] = useState(query.keyword)
  const [animeList, setAnimeList] = useState<Subject[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const totalPages = Math.ceil(total / limit)
  const visiblePages = Array.from(
    { length: Math.max(0, Math.min(totalPages, page + 2) - Math.max(1, page - 2) + 1) },
    (_, index) => Math.max(1, page - 2) + index
  )

  useEffect(() => {
    setKeyword(query.keyword)
  }, [query.keyword])
  useEffect(() => {
    const controller = new AbortController()
    void fetch('/api/v1/anime/tags', { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error()
        return response.json()
      })
      .then(payload => {
        if (!controller.signal.aborted)
          setTags((Array.isArray(payload.data) ? payload.data : []).slice(0, 20))
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    void fetch(browseEndpoint(query), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25000)])
    })
      .then(async response => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || '加载失败')
        if (controller.signal.aborted) return
        setAnimeList(Array.isArray(payload.data) ? payload.data : [])
        setTotal(Number(payload.total || 0))
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('加载失败，请重试')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [query, retry])

  const navigate = (changes: Partial<BrowseQuery>) => {
    const next = { ...query, ...changes }
    const url = browseParams(next).toString()
    if (url === queryString) setRetry(value => value + 1)
    else router.push('/anime?' + url, { scroll: false })
  }
  const selectType = (type: number) => navigate({ type, page: 1 })
  const toggleTag = (tag: string) =>
    navigate({
      tags: selectedTags.includes(tag)
        ? selectedTags.filter(item => item !== tag)
        : [...selectedTags, tag],
      page: 1
    })
  const search = () => navigate({ keyword: keyword.trim(), page: 1 })
  const goPage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return
    navigate({ page: nextPage })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-4 text-base-content">
          {query.keyword ? `搜索：${query.keyword}` : selectedTags.length ? '筛选结果' : '热门番剧'}
        </h1>
        <form
          className="flex flex-wrap gap-3 items-center mb-4"
          onSubmit={event => {
            event.preventDefault()
            search()
          }}
        >
          <div className="relative flex-1 min-w-60 max-w-md">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="m21 21-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
              />
            </svg>
            <input
              value={keyword}
              onChange={event => setKeyword(event.target.value)}
              aria-label="搜索条目"
              placeholder="搜索动画、书籍、音乐..."
              className="input input-bordered input-sm w-full pl-9"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">
            搜索
          </button>
        </form>
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {typeOptions.map(type => (
            <button
              key={type.value}
              aria-pressed={filterType === type.value}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${filterType === type.value ? 'bg-primary text-primary-content shadow-sm' : 'bg-base-200/60 text-base-content/60 hover:bg-base-200'}`}
              type="button"
              onClick={() => selectType(type.value)}
            >
              {type.label}
            </button>
          ))}
        </div>
        {tags.length ? (
          <div className="flex flex-wrap gap-2">
            {tags.map(tag =>
              tag.name ? (
                <button
                  key={tag.name}
                  aria-pressed={selectedTags.includes(tag.name)}
                  className={`badge badge-lg cursor-pointer transition-all ${selectedTags.includes(tag.name) ? 'badge-primary' : 'badge-ghost'}`}
                  type="button"
                  onClick={() => toggleTag(tag.name!)}
                >
                  {tag.name}
                </button>
              ) : null
            )}
          </div>
        ) : null}
      </div>
      <VueLoadingState
        loading={loading}
        error={error}
        onRetry={() => setRetry(value => value + 1)}
      />
      {!loading && !error ? (
        <div>
          {!animeList.length ? (
            <div className="py-20 text-center text-base-content/50">
              <p className="text-lg mb-2">暂无结果</p>
              <p className="text-sm">尝试其他关键词或筛选条件</p>
            </div>
          ) : (
            <AnimeGrid subjects={animeList} />
          )}
          {totalPages > 1 ? (
            <div className="join mt-8 flex justify-center">
              <button
                disabled={page <= 1}
                className="join-item btn btn-sm"
                type="button"
                onClick={() => goPage(page - 1)}
              >
                «
              </button>
              {visiblePages.map(number => (
                <button
                  key={number}
                  className={`join-item btn btn-sm ${number === page ? 'btn-active' : ''}`}
                  type="button"
                  onClick={() => goPage(number)}
                >
                  {number}
                </button>
              ))}
              <button
                disabled={page >= totalPages}
                className="join-item btn btn-sm"
                type="button"
                onClick={() => goPage(page + 1)}
              >
                »
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
