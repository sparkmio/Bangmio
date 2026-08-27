'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnimeGrid } from '@/components/anime-card'
import { VueLoadingState } from '@/components/vue-loading-state'
import type { Subject } from '@/lib/types'

type Tag = { name?: string; count?: number }
const typeOptions = [{ label: '全部', value: 0 }, { label: '动画', value: 2 }, { label: '书籍', value: 1 }, { label: '音乐', value: 3 }, { label: '游戏', value: 4 }]
const limit = 20

export default function AnimeBrowsePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '')
  const [animeList, setAnimeList] = useState<Subject[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [filterType, setFilterType] = useState(Number(searchParams.get('type') || 0))
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get('page') || 1)))
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const totalPages = Math.ceil(total / limit)
  const visiblePages = useMemo(() => Array.from({ length: Math.max(0, Math.min(totalPages, page + 2) - Math.max(1, page - 2) + 1) }, (_, index) => Math.max(1, page - 2) + index), [page, totalPages])

  const updateUrl = (nextPage: number, nextType: number, nextKeyword: string) => {
    const params = new URLSearchParams()
    params.set('page', String(nextPage))
    params.set('type', String(nextType))
    if (nextKeyword.trim()) params.set('keyword', nextKeyword.trim())
    router.replace(`/anime?${params.toString()}`, { scroll: false })
  }

  const load = async (nextPage = page, nextType = filterType, nextKeyword = keyword, nextTags = selectedTags) => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: String(limit) })
      let endpoint = '/api/v1/anime/browse'
      if (nextKeyword.trim()) { endpoint = '/api/v1/anime/search'; params.set('keyword', nextKeyword.trim()); if (nextType) params.set('type', String(nextType)) }
      else { params.set('sort', 'heat'); params.set('type', String(nextType)); if (nextTags.length) params.set('tag', nextTags.join(',')) }
      const response = await fetch(`${endpoint}?${params.toString()}`, { headers: { Accept: 'application/json' } })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '加载失败')
      setAnimeList(Array.isArray(payload.data) ? payload.data : [])
      setTotal(Number(payload.total || 0))
      updateUrl(nextPage, nextType, nextKeyword)
    } catch { setError('加载失败') } finally { setLoading(false) }
  }

  useEffect(() => {
    void fetch('/api/v1/anime/tags', { headers: { Accept: 'application/json' } }).then(response => response.json()).then(payload => setTags((Array.isArray(payload.data) ? payload.data : []).slice(0, 20))).catch(() => undefined)
    void load()
  }, [])

  const selectType = (type: number) => { setFilterType(type); setPage(1); void load(1, type) }
  const toggleTag = (tag: string) => {
    const nextTags = selectedTags.includes(tag) ? selectedTags.filter(item => item !== tag) : [...selectedTags, tag]
    setSelectedTags(nextTags); setPage(1); void load(1, filterType, keyword, nextTags)
  }
  const search = () => { setSelectedTags([]); setPage(1); void load(1, filterType, keyword, []) }
  const goPage = (nextPage: number) => { if (nextPage < 1 || nextPage > totalPages) return; setPage(nextPage); void load(nextPage); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return <div><div className="mb-6"><h1 className="text-2xl font-semibold mb-4 text-base-content">热门</h1><div className="flex flex-wrap gap-3 items-center mb-4"><div className="relative flex-1 min-w-60 max-w-md"><svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" /></svg><input value={keyword} onChange={event => setKeyword(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') search() }} placeholder="搜索番剧..." className="input input-bordered input-sm w-full pl-9" /></div></div><div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">{typeOptions.map(type => <button key={type.value} className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${filterType === type.value ? 'bg-primary text-primary-content shadow-sm' : 'bg-base-200/60 text-base-content/60 hover:bg-base-200'}`} type="button" onClick={() => selectType(type.value)}>{type.label}</button>)}</div>{tags.length ? <div className="flex flex-wrap gap-2">{tags.map(tag => tag.name ? <button key={tag.name} className={`badge badge-lg cursor-pointer transition-all ${selectedTags.includes(tag.name) ? 'badge-primary' : 'badge-ghost'}`} type="button" onClick={() => toggleTag(tag.name!)}>{tag.name}</button> : null)}</div> : null}</div><VueLoadingState loading={loading} error={error} onRetry={() => void load()} />{!loading && !error ? <div>{!animeList.length ? <div className="py-20 text-center text-base-content/50"><p className="text-lg mb-2">暂无结果</p><p className="text-sm">尝试其他关键词或筛选条件</p></div> : <AnimeGrid subjects={animeList} />}{totalPages > 1 ? <div className="join mt-8 flex justify-center"><button disabled={page <= 1} className="join-item btn btn-sm" type="button" onClick={() => goPage(page - 1)}>«</button>{visiblePages.map(number => <button key={number} className={`join-item btn btn-sm ${number === page ? 'btn-active' : ''}`} type="button" onClick={() => goPage(number)}>{number}</button>)}<button disabled={page >= totalPages} className="join-item btn btn-sm" type="button" onClick={() => goPage(page + 1)}>»</button></div> : null}</div> : null}</div>
}