'use client'

import Link from 'next/link'
import { Modal } from './modal'
import { collectionOptions, formatEpisodeDuration } from '@/lib/collection-options'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { displayName, imageUrl } from '@/lib/api'
import type { Collection, Subject } from '@/lib/types'
import { AnimeGrid } from './anime-card'
import { useAuth } from './auth-provider'
import { VueLoadingState } from './vue-loading-state'

type WatchingSubject = Subject & {
  ep_status?: number
  total_episodes?: number
  collection_type?: number
}
type Episode = {
  sort?: number
  name?: string
  name_cn?: string
  airdate?: string
  duration_seconds?: number
}
type EpisodePopup = { episode: number; name: string; airdate: string; duration: number }
type CollectionRecord = Collection & { subject_type?: number; anime_id?: number; episode?: number }

const typeTabs = [
  { label: '全部', value: 0 },
  { label: '动画', value: 2 },
  { label: '三次元', value: 6 },
  { label: '书籍', value: 1 }
]

function collectionSubject(collection: CollectionRecord): WatchingSubject | null {
  const subject = collection.subject
  const id = Number(collection.subject_id || subject?.id || collection.anime_id || 0)
  if (!id) return null
  return {
    ...(subject || {}),
    id,
    type: Number(subject?.type || collection.subject_type || 2),
    ep_status: Number(collection.ep_status || collection.episode || 0),
    total_episodes: Number(subject?.eps || subject?.eps_count || 0),
    collection_type: Number(collection.type || 3)
  }
}

export function HomeClient({ initialHot }: { initialHot: Subject[] }) {
  const { isAuthenticated, request } = useAuth()
  const [watchingType, setWatchingType] = useState(0)
  const [watchingList, setWatchingList] = useState<WatchingSubject[]>([])
  const [selectedId, setSelectedId] = useState(0)
  const [watchingLoading, setWatchingLoading] = useState(false)
  const [watchingError, setWatchingError] = useState('')
  const [trendingList, setTrendingList] = useState<Subject[]>(initialHot)
  const [trendingLoading, setTrendingLoading] = useState(!initialHot.length)
  const [trendingError, setTrendingError] = useState('')
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [popupError, setPopupError] = useState('')
  const [popupBusy, setPopupBusy] = useState(false)
  const episodeRequest = useRef(0)
  const watchingRequest = useRef(0)
  const [episodePopup, setEpisodePopup] = useState<EpisodePopup | null>(null)

  const selectedWatching = useMemo(
    () => watchingList.find(item => item.id === selectedId) || null,
    [selectedId, watchingList]
  )
  const epStatusOptions = collectionOptions(Number(selectedWatching?.type || watchingType || 2))

  const fetchEpisodes = useCallback(
    async (subjectId: number) => {
      const requestId = ++episodeRequest.current
      setEpisodes([])
      try {
        const payload = await request<Episode[]>(
          `/anime/${subjectId}/episodes`,
          {},
          { authenticate: false }
        )
        const data = Array.isArray(payload.data) ? payload.data : []
        if (requestId === episodeRequest.current) setEpisodes(data)
      } catch {
        if (requestId === episodeRequest.current) setEpisodes([])
      }
    },
    [request]
  )

  const fetchWatching = useCallback(async () => {
    if (!isAuthenticated) return
    const requestId = ++watchingRequest.current
    ++episodeRequest.current
    setEpisodePopup(null)
    setEpisodes([])
    setWatchingLoading(true)
    setWatchingError('')
    try {
      const filter = watchingType ? `&subject_type=${watchingType}` : ''
      const payload = await request<CollectionRecord[]>(
        `/collection/list?offset=0&limit=30&type=3${filter}`
      )
      const next = (Array.isArray(payload.data) ? payload.data : [])
        .filter(
          collection => Number(collection.subject?.type || collection.subject_type || 0) !== 4
        )
        .map(collectionSubject)
        .filter((item): item is WatchingSubject => Boolean(item))
      if (requestId !== watchingRequest.current) return
      setWatchingList(next)
      setSelectedId(next[0]?.id || 0)
      setEpisodes([])
      if (next[0]?.id) void fetchEpisodes(next[0].id)
    } catch {
      if (requestId === watchingRequest.current) setWatchingError('加载失败')
    } finally {
      if (requestId === watchingRequest.current) setWatchingLoading(false)
    }
  }, [isAuthenticated, watchingType, request, fetchEpisodes])

  const fetchTrending = async () => {
    setTrendingLoading(true)
    setTrendingError('')
    try {
      const response = await fetch('/api/v1/anime/browse?sort=heat&type=2&limit=12', {
        headers: { Accept: 'application/json' }
      })
      const payload = await response.json()
      if (!response.ok) throw new Error('加载失败')
      setTrendingList(Array.isArray(payload.data) ? payload.data : [])
    } catch {
      setTrendingError('加载失败')
    } finally {
      setTrendingLoading(false)
    }
  }

  useEffect(() => {
    void fetchTrending()
  }, [])
  const invalidateRequests = useCallback(() => {
    ++watchingRequest.current
    ++episodeRequest.current
  }, [])
  useEffect(() => {
    if (isAuthenticated) void fetchWatching()
    else {
      setWatchingList([])
      setSelectedId(0)
      setEpisodes([])
      setEpisodePopup(null)
    }
    return invalidateRequests
  }, [isAuthenticated, fetchWatching, invalidateRequests])

  const selectWatching = (item: WatchingSubject) => {
    setSelectedId(item.id)
    setEpisodePopup(null)
    void fetchEpisodes(item.id)
  }
  const openEpisode = (episode: number) => {
    setPopupError('')
    const data = episodes.find(item => Number(item.sort) === episode)
    setEpisodePopup({
      episode,
      name: data?.name_cn || data?.name || `第${episode}话`,
      airdate: data?.airdate || '',
      duration: Number(data?.duration_seconds || 0)
    })
  }
  const updateWatchingStatus = async (type: number) => {
    if (!selectedWatching?.id || popupBusy) return
    setPopupBusy(true)
    setPopupError('')
    try {
      await request(`/collection/${selectedWatching.id}`, {
        method: 'POST',
        body: JSON.stringify({ status: type })
      })
      if (type !== 3) {
        setWatchingList(items => items.filter(item => item.id !== selectedWatching.id))
        setSelectedId(0)
      }
      setEpisodePopup(null)
    } catch {
      setPopupError('收藏状态保存失败，请重试')
    } finally {
      setPopupBusy(false)
    }
  }

  return (
    <div>
      {!isAuthenticated ? (
        <section className="mb-10">
          <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 border border-primary/20 p-8 sm:p-12 text-center">
            <h1 className="text-3xl sm:text-4xl font-black text-primary mb-3">Bangmio</h1>
            <p className="text-base-content/60 text-sm sm:text-base mb-6 max-w-md mx-auto">
              发现、记录、分享你的番剧世界
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/login" className="btn btn-primary rounded-full px-6">
                登录 Bangmio
              </Link>
              <Link href="/register" className="btn btn-outline rounded-full px-6">
                注册
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {isAuthenticated ? (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-base-content">在追</h2>
            <Link href="/watching" className="text-sm text-primary hover-underline-wipe">
              查看全部 →
            </Link>
          </div>
          <div className="flex gap-1.5 mb-5 overflow-x-auto scrollbar-hide">
            {typeTabs.map(tab => (
              <button
                key={tab.value}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${watchingType === tab.value ? 'bg-primary text-primary-content shadow-sm' : 'bg-base-200/60 text-base-content/60 hover:bg-base-200'}`}
                type="button"
                onClick={() => setWatchingType(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <VueLoadingState
            loading={watchingLoading}
            error={watchingError}
            onRetry={() => void fetchWatching()}
          />
          {!watchingLoading && !watchingError && watchingList.length ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-start">
              <div className="lg:col-span-3">
                <div
                  className="space-y-1 overflow-y-auto pr-1 scrollbar-hide -mx-1 px-1"
                  style={{ maxHeight: 'min(420px, 45vh)' }}
                >
                  {watchingList.map(item => (
                    <button
                      key={item.id}
                      className={`w-full flex items-center gap-3 p-2 sm:p-2.5 rounded-lg text-left transition-all duration-200 min-h-[48px] ${selectedWatching?.id === item.id ? 'bg-primary/10 border-l-2 border-primary pl-3' : 'hover:bg-base-200/60 border-l-2 border-transparent'}`}
                      type="button"
                      onClick={() => selectWatching(item)}
                    >
                      {imageUrl(item.images) ? (
                        <img
                          src={imageUrl(item.images)}
                          alt={displayName(item)}
                          className="w-10 h-14 sm:w-11 sm:h-[60px] rounded object-cover flex-shrink-0"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] sm:text-sm font-medium text-base-content line-clamp-1 hover:text-primary transition-colors cursor-pointer">
                          {displayName(item)}
                        </p>
                        <p className="text-xs text-primary font-semibold mt-0.5">
                          [{item.ep_status || 0}/{item.total_episodes || '?'}]
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-9">
                {selectedWatching ? (
                  <div className="rounded-xl bg-base-200/40 p-5">
                    <div className="flex gap-5 mb-4">
                      {imageUrl(selectedWatching.images) ? (
                        <img
                          src={imageUrl(selectedWatching.images)}
                          alt={displayName(selectedWatching)}
                          className="w-24 h-32 sm:w-28 sm:h-40 rounded-lg object-cover shadow-md flex-shrink-0"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold text-base-content mb-1">
                          {displayName(selectedWatching)}
                        </h3>
                        <p className="text-sm text-base-content/50 mb-3">{selectedWatching.name}</p>
                        <div className="flex gap-3 text-sm">
                          <Link
                            href={`/anime/${selectedWatching.id}/topics`}
                            className="text-primary hover-underline-wipe"
                          >
                            参与讨论
                          </Link>
                          <Link
                            href={`/anime/${selectedWatching.id}/talkbox`}
                            className="text-primary hover-underline-wipe"
                          >
                            观吐槽
                          </Link>
                          <Link
                            href={`/anime/${selectedWatching.id}`}
                            className="text-primary hover-underline-wipe"
                          >
                            详情页
                          </Link>
                        </div>
                      </div>
                    </div>
                    {selectedWatching.total_episodes ? (
                      <div className="mt-4">
                        <p className="text-xs text-base-content/40 mb-2">
                          播放进度 · 已看 {selectedWatching.ep_status || 0} /{' '}
                          {selectedWatching.total_episodes}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {Array.from(
                            { length: Math.min(selectedWatching.total_episodes, 24) },
                            (_, index) => index + 1
                          ).map(episode => (
                            <button
                              key={episode}
                              className={`min-w-10 min-h-9 px-1 rounded-lg text-xs font-bold flex items-center justify-center transition-all hover:scale-110 cursor-pointer ${episode <= (selectedWatching.ep_status || 0) ? 'bg-primary text-white' : 'bg-base-300 text-base-content/40 hover:bg-base-300/80'}`}
                              type="button"
                              onClick={() => openEpisode(episode)}
                            >
                              {String(episode).padStart(2, '0')}
                            </button>
                          ))}
                        </div>
                        <Link
                          className="text-primary text-sm mt-3 inline-block"
                          href={`/anime/${selectedWatching.id}`}
                        >
                          {selectedWatching.total_episodes > 24
                            ? `查看全部 ${selectedWatching.total_episodes} 集并管理进度 →`
                            : '管理观看进度 →'}
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="py-12 text-center text-base-content/30 text-sm rounded-xl bg-base-200/30">
                    选择左侧的番剧查看详情
                  </div>
                )}
              </div>
            </div>
          ) : !watchingLoading && !watchingError ? (
            <div className="text-center py-10 rounded-xl bg-base-200/30">
              <p className="text-sm text-base-content/40">还没有在追的内容</p>
              <Link
                href="/anime"
                className="text-sm text-primary mt-1 inline-block hover-underline-wipe"
              >
                去探索
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-base-content">热门番剧</h2>
          <Link href="/anime?type=2" className="text-sm text-primary hover-underline-wipe">
            查看全部 →
          </Link>
        </div>
        <VueLoadingState
          loading={trendingLoading}
          error={trendingError}
          skeleton
          onRetry={() => void fetchTrending()}
        />
        {!trendingLoading && !trendingError ? (
          <AnimeGrid subjects={trendingList.slice(0, 8)} />
        ) : null}
      </section>

      {!isAuthenticated ? (
        <section className="mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/trending"
              className="card bg-base-100 border border-base-300 hover:shadow-card transition-all p-5 rounded-xl"
            >
              <h3 className="text-base font-bold text-base-content mb-1">新番时间表</h3>
              <p className="text-sm text-base-content/50">查看本季所有新番播放时间</p>
            </Link>
            <Link
              href="/anime"
              className="card bg-base-100 border border-base-300 hover:shadow-card transition-all p-5 rounded-xl"
            >
              <h3 className="text-base font-bold text-base-content mb-1">搜索番剧</h3>
              <p className="text-sm text-base-content/50">探索更多动画、书籍、音乐</p>
            </Link>
          </div>
        </section>
      ) : null}

      {episodePopup ? (
        <Modal title="章节信息与作品收藏状态" onClose={() => setEpisodePopup(null)}>
          <div className="relative bg-base-100 rounded-2xl p-5 border border-base-300">
            <button
              className="absolute top-3 right-3 text-base-content/40 hover:text-base-content transition-colors"
              type="button"
              onClick={() => setEpisodePopup(null)}
              aria-label="关闭"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </button>
            <h3 className="text-base font-semibold text-base-content mb-4 pr-8">
              ep.{episodePopup.episode} {episodePopup.name}
            </h3>
            <p className="text-sm mb-2">整部作品的收藏状态（不是本集进度）</p>
            {popupError ? <p role="alert">{popupError}</p> : null}
            <div className="flex flex-wrap gap-2 mb-4">
              {epStatusOptions.map(status => (
                <button
                  key={status.value}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${selectedWatching?.collection_type === status.value ? 'bg-primary text-primary-content shadow-sm' : 'bg-base-200/60 text-base-content/60 hover:bg-base-200'}`}
                  type="button"
                  disabled={popupBusy}
                  onClick={() => void updateWatchingStatus(status.value)}
                >
                  {status.label}
                </button>
              ))}
            </div>
            <div className="space-y-2 text-sm text-base-content/60">
              <div className="flex justify-between">
                <span>首播</span>
                <span className="text-base-content">{episodePopup.airdate || '未知'}</span>
              </div>
              <div className="flex justify-between">
                <span>时长</span>
                <span className="text-base-content">
                  {formatEpisodeDuration(episodePopup.duration)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>讨论</span>
                {selectedWatching?.id ? (
                  <Link
                    href={`/anime/${selectedWatching.id}/topics`}
                    className="text-primary hover-underline-wipe"
                    onClick={() => setEpisodePopup(null)}
                  >
                    参与讨论
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
