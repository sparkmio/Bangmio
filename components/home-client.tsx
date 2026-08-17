'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimeGrid } from '@/components/anime-card'
import { displayName, imageUrl } from '@/lib/api'
import type { Collection, Subject } from '@/lib/types'
import { useAuth } from './auth-provider'

type WatchingSubject = Subject & { ep_status?: number; total_episodes?: number }
const typeTabs = [{ value: 0, label: '全部' }, { value: 2, label: '动画' }, { value: 6, label: '三次元' }, { value: 1, label: '书籍' }]

function collectionSubject(collection: Collection): WatchingSubject | null {
  const subject = collection.subject
  const id = Number(collection.subject_id || subject?.id || collection.anime_id || 0)
  if (!id) return null
  return { ...(subject || {}), id, ep_status: Number(collection.ep_status || 0), total_episodes: Number(subject?.eps || subject?.eps_count || 0) }
}

function WatchingPanel() {
  const { isAuthenticated, request } = useAuth()
  const [watchingType, setWatchingType] = useState(0)
  const [watchingList, setWatchingList] = useState<WatchingSubject[]>([])
  const [selectedId, setSelectedId] = useState(0)
  const [watchingLoading, setWatchingLoading] = useState(false)
  const [watchingError, setWatchingError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!isAuthenticated) return
    let alive = true
    setWatchingLoading(true)
    setWatchingError('')
    const filter = watchingType ? `&subject_type=${watchingType}` : ''
    void request<Collection[]>(`/collection/list?offset=0&limit=30&type=3${filter}`)
      .then(payload => {
        if (!alive) return
        const list = Array.isArray(payload.data) ? payload.data : []
        const next = list.filter(collection => Number(collection.subject?.type || collection.subject_type || 0) !== 4).map(collectionSubject).filter((item): item is WatchingSubject => Boolean(item))
        setWatchingList(next)
        setSelectedId(next[0]?.id || 0)
      })
      .catch(() => { if (alive) setWatchingError('加载失败') })
      .finally(() => { if (alive) setWatchingLoading(false) })
    return () => { alive = false }
  }, [isAuthenticated, request, retry, watchingType])

  const selectedWatching = useMemo(() => watchingList.find(item => item.id === selectedId) || watchingList[0] || null, [selectedId, watchingList])
  const watched = Number(selectedWatching?.ep_status || 0)
  const total = Number(selectedWatching?.total_episodes || 0)
  const episodeCount = Math.min(total || Math.max(watched, 12), 24)

  return <section className="mb-10">
    <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-semibold text-base-content">在追</h2><Link href="/watching" className="text-sm text-primary hover-underline-wipe">查看全部 →</Link></div>
    <div className="flex gap-1.5 mb-5 overflow-x-auto scrollbar-hide">{typeTabs.map(tab => <button key={tab.value} className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${watchingType === tab.value ? 'bg-primary text-primary-content shadow-sm' : 'bg-base-200/60 text-base-content/60 hover:bg-base-200'}`} onClick={() => setWatchingType(tab.value)} type="button">{tab.label}</button>)}</div>
    {watchingLoading ? <div className="py-12 text-center text-base-content/30 text-sm rounded-xl bg-base-200/30">正在加载在追内容…</div> : null}
    {watchingError ? <div className="py-12 text-center text-error text-sm rounded-xl bg-base-200/30">{watchingError}<button className="btn btn-ghost btn-sm ml-2" type="button" onClick={() => setRetry(value => value + 1)}>重试</button></div> : null}
    {!watchingLoading && !watchingError && watchingList.length ? <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-start">
      <div className="lg:col-span-3"><div className="space-y-1 overflow-y-auto pr-1 scrollbar-hide -mx-1 px-1" style={{ maxHeight: 'min(420px, 45vh)' }}>{watchingList.map(item => { const image = imageUrl(item.images); const itemTotal = Number(item.total_episodes || 0); return <button key={item.id} className={`w-full flex items-center gap-3 p-2 sm:p-2.5 rounded-lg text-left transition-all duration-200 min-h-[48px] ${selectedWatching?.id === item.id ? 'bg-primary/10 border-l-2 border-primary pl-3' : 'hover:bg-base-200/60 border-l-2 border-transparent'}`} onClick={() => setSelectedId(item.id)} type="button">{image ? <img src={image} alt={displayName(item)} className="w-10 h-14 sm:w-11 sm:h-[60px] rounded object-cover flex-shrink-0" loading="lazy" decoding="async" /> : null}<div className="min-w-0 flex-1"><p className="text-[13px] sm:text-sm font-medium text-base-content line-clamp-1 hover:text-primary transition-colors cursor-pointer">{displayName(item)}</p><p className="text-xs text-primary font-semibold mt-0.5">[{Number(item.ep_status || 0)}/{itemTotal || '?'}]</p></div></button> })}</div></div>
      <div className="lg:col-span-9">{selectedWatching ? <div className="rounded-xl bg-base-200/40 p-5"><div className="flex gap-5 mb-4">{imageUrl(selectedWatching.images) ? <img src={imageUrl(selectedWatching.images)} alt={displayName(selectedWatching)} className="w-24 h-32 sm:w-28 sm:h-40 rounded-lg object-cover shadow-md flex-shrink-0" /> : null}<div className="min-w-0 flex-1"><h3 className="text-lg font-semibold text-base-content mb-1">{displayName(selectedWatching)}</h3>{selectedWatching.name && selectedWatching.name_cn && selectedWatching.name !== selectedWatching.name_cn ? <p className="text-sm text-base-content/50 mb-3">{selectedWatching.name}</p> : null}<div className="flex gap-3 text-sm"><Link href={`/anime/${selectedWatching.id}/topics`} className="text-primary hover-underline-wipe">参与讨论</Link><Link href={`/anime/${selectedWatching.id}/talkbox`} className="text-primary hover-underline-wipe">观吐槽</Link><Link href={`/anime/${selectedWatching.id}`} className="text-primary hover-underline-wipe">详情页</Link></div></div></div><div className="mt-4"><p className="text-xs text-base-content/40 mb-2">播放进度 · 已看 {watched} / {total || '?'}</p><div className="flex flex-wrap gap-1.5">{Array.from({ length: episodeCount }, (_, index) => index + 1).map(ep => <button key={ep} className={`min-w-10 min-h-9 px-1 rounded-lg text-xs font-bold flex items-center justify-center transition-all hover:scale-110 cursor-pointer ${ep <= watched ? 'bg-primary text-white' : 'bg-base-300 text-base-content/40 hover:bg-base-300/80'}`} type="button">{String(ep).padStart(2, '0')}</button>)}</div></div></div> : <div className="py-12 text-center text-base-content/30 text-sm rounded-xl bg-base-200/30">选择左侧的番剧查看详情</div>}</div>
    </div> : null}
    {!watchingLoading && !watchingError && !watchingList.length ? <div className="text-center py-10 rounded-xl bg-base-200/30"><p className="text-sm text-base-content/40">还没有在追的内容</p><Link href="/anime" className="text-sm text-primary mt-1 inline-block hover-underline-wipe">去探索</Link></div> : null}
  </section>
}

function GuestHome() {
  return <section className="mb-10"><div className="rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 border border-primary/20 p-8 sm:p-12 text-center"><h1 className="text-3xl sm:text-4xl font-black text-primary mb-3">Bangmio</h1><p className="text-base-content/60 text-sm sm:text-base mb-6 max-w-md mx-auto">发现、记录、分享你的番剧世界</p><div className="flex items-center justify-center gap-3"><Link href="/login" className="btn btn-primary rounded-full px-6">登录 Bangmio</Link><Link href="/register" className="btn btn-outline rounded-full px-6">注册</Link></div></div></section>
}

export function HomeClient({ initialHot }: { initialHot: Subject[] }) {
  const { ready, isAuthenticated } = useAuth()
  const [hot, setHot] = useState(initialHot)
  useEffect(() => { if (initialHot.length) return; let alive = true; void fetch('/api/v1/anime/browse?sort=heat&type=2&limit=12').then(response => response.json()).then(payload => { if (alive && Array.isArray(payload?.data)) setHot(payload.data) }).catch(() => undefined); return () => { alive = false } }, [initialHot.length])
  return <div>{ready && isAuthenticated ? <WatchingPanel /> : <GuestHome />}<section className="mb-10"><div className="flex items-center justify-between mb-4"><h2 className="text-xl font-semibold text-base-content">热门新番</h2><Link href="/trending" className="text-sm text-primary hover-underline-wipe">查看全部 →</Link></div><AnimeGrid subjects={hot.slice(0, 8)} empty="暂时没有热门条目" /></section>{!isAuthenticated ? <section className="mb-10"><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Link href="/trending" className="card bg-base-100 border border-base-300 hover:shadow-card transition-all p-5 rounded-xl"><h3 className="text-base font-bold text-base-content mb-1">新番时间表</h3><p className="text-sm text-base-content/50">查看本季所有新番播放时间</p></Link><Link href="/anime" className="card bg-base-100 border border-base-300 hover:shadow-card transition-all p-5 rounded-xl"><h3 className="text-base font-bold text-base-content mb-1">搜索番剧</h3><p className="text-sm text-base-content/50">探索更多动画、书籍、音乐</p></Link></div></section> : null}</div>
}
