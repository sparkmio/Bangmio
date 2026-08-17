'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimeGrid } from '@/components/anime-card'
import { displayName, imageUrl } from '@/lib/api'
import type { Collection, Subject } from '@/lib/types'
import { useAuth } from './auth-provider'

type WatchingSubject = Subject & {
  ep_status?: number
  total_episodes?: number
}

const tabs = [
  { value: 0, label: '全部' },
  { value: 2, label: '动画' },
  { value: 6, label: '三次元' },
  { value: 1, label: '书籍' }
]

function collectionSubject(collection: Collection): WatchingSubject | null {
  const subject = collection.subject
  const id = Number(collection.subject_id || subject?.id || collection.anime_id || 0)
  if (!id) return null
  return {
    ...(subject || {}),
    id,
    ep_status: Number(collection.ep_status || collection.episode || 0),
    total_episodes: Number(subject?.eps || subject?.eps_count || subject?.total_episodes || 0)
  }
}

function WatchingPanel() {
  const { isAuthenticated, request } = useAuth()
  const [subjectType, setSubjectType] = useState(0)
  const [items, setItems] = useState<WatchingSubject[]>([])
  const [selectedId, setSelectedId] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!isAuthenticated) return
    let current = true
    setLoading(true)
    setError('')
    setItems([])
    setSelectedId(0)
    const filter = subjectType ? `&subject_type=${subjectType}` : ''
    void request<Collection[]>(`/collection/list?offset=0&limit=30&type=3${filter}`)
      .then(payload => {
        if (!current) return
        const list = Array.isArray(payload.data) ? payload.data : []
        const next = list
          .filter(collection => Number(collection.subject?.type || collection.subject_type || 0) !== 4)
          .map(collectionSubject)
          .filter((subject): subject is WatchingSubject => Boolean(subject))
        setItems(next)
        setSelectedId(next[0]?.id || 0)
      })
      .catch(() => {
        if (current) setError('加载失败')
      })
      .finally(() => {
        if (current) setLoading(false)
      })
    return () => { current = false }
  }, [isAuthenticated, request, subjectType, retryKey])

  const selected = useMemo(
    () => items.find(item => item.id === selectedId) || items[0] || null,
    [items, selectedId]
  )
  const totalEpisodes = Number(selected?.total_episodes || selected?.eps || selected?.eps_count || 0)
  const watchedEpisodes = Number(selected?.ep_status || 0)
  const episodeCount = Math.min(totalEpisodes || Math.max(watchedEpisodes, 12), 24)

  return (
    <section className="home-watching">
      <div className="watching-heading home-watching-heading">
        <h1>在追</h1>
        <Link className="text-link" href="/watching">查看全部 →</Link>
      </div>
      <div className="watching-tabs" role="tablist" aria-label="在追媒介类型">
        {tabs.map(tab => (
          <button
            className={subjectType === tab.value ? 'active' : ''}
            key={tab.value}
            onClick={() => setSubjectType(tab.value)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? <div className="home-watching-state">正在加载在追内容…</div> : null}
      {error ? <div className="home-watching-state error">{error}<button type="button" onClick={() => setRetryKey(value => value + 1)}>重试</button></div> : null}
      {!loading && !error && !items.length ? <div className="home-watching-state">还没有在追的内容<Link href="/anime">去探索</Link></div> : null}

      {!loading && !error && items.length ? <div className="watching-layout home-watching-layout">
        <aside className="watching-list" aria-label="在追作品列表">
          {items.map(item => {
            const total = Number(item.total_episodes || item.eps || item.eps_count || 0)
            const image = imageUrl(item.images)
            return <button className={selected?.id === item.id ? 'watching-list-item active' : 'watching-list-item'} key={item.id} onClick={() => setSelectedId(item.id)} type="button">
              {image ? <img src={image} alt="" /> : <span className="watching-list-placeholder">暂无封面</span>}
              <span><strong>{displayName(item)}</strong><small>[{Number(item.ep_status || 0)}/{total || '?'}]</small></span>
            </button>
          })}
        </aside>

        {selected ? <article className="watching-detail">
          <div className="watching-detail-main">
            {imageUrl(selected.images) ? <img className="watching-detail-cover" src={imageUrl(selected.images)} alt="" /> : <div className="watching-detail-cover cover-placeholder">暂无封面</div>}
            <div className="watching-detail-copy">
              <div className="watching-detail-title"><div><h2>{displayName(selected)}</h2>{selected.name && selected.name_cn && selected.name !== selected.name_cn ? <p>{selected.name}</p> : null}</div></div>
              <div className="watching-links"><Link href={`/anime/${selected.id}/topics`}>参与讨论</Link><Link href={`/anime/${selected.id}/talkbox`}>观吐槽</Link><Link href={`/anime/${selected.id}`}>详情页</Link></div>
            </div>
          </div>
          <div className="episode-progress">
            <p>播放进度 · 已看 {watchedEpisodes} / {totalEpisodes || '?'}</p>
            <div className="episode-buttons">
              {Array.from({ length: episodeCount }, (_, index) => index + 1).map(episode => <span className={episode <= watchedEpisodes ? 'watched' : ''} key={episode}>{String(episode).padStart(2, '0')}</span>)}
            </div>
          </div>
        </article> : null}
      </div> : null}
    </section>
  )
}

function GuestHome() {
  return <section className="home-welcome">
    <div className="welcome-card">
      <h1>Bangmio</h1>
      <p>发现、记录、分享你的番剧世界</p>
      <div className="welcome-actions">
        <Link href="/login" className="legacy-btn primary">登录 Bangmio</Link>
        <Link href="/register" className="legacy-btn outline">注册</Link>
      </div>
    </div>
  </section>
}

export function HomeClient({ initialHot }: { initialHot: Subject[] }) {
  const { ready, isAuthenticated } = useAuth()
  const [hot, setHot] = useState(initialHot)

  useEffect(() => {
    if (initialHot.length) return
    let current = true
    void fetch('/api/v1/anime/browse?sort=heat&type=2&limit=12')
      .then(response => response.json())
      .then(payload => {
        if (current && Array.isArray(payload?.data)) setHot(payload.data)
      })
      .catch(() => undefined)
    return () => { current = false }
  }, [initialHot.length])

  return <div className="legacy-home">
    {ready && isAuthenticated ? <WatchingPanel /> : <GuestHome />}
    <section className="legacy-section home-hot">
      <div className="legacy-section-heading">
        <h2>热门新番</h2>
        <Link href="/trending" className="legacy-text-link">查看全部 →</Link>
      </div>
      <AnimeGrid subjects={hot.slice(0, 8)} empty="暂时没有热门条目" />
    </section>
    {!isAuthenticated ? <section className="legacy-section explore-section">
      <div className="explore-grid">
        <Link href="/trending" className="explore-card"><h3>新番时间表</h3><p>查看本季所有新番播放时间</p></Link>
        <Link href="/anime" className="explore-card"><h3>搜索番剧</h3><p>探索更多动画、书籍、音乐</p></Link>
      </div>
    </section> : null}
  </div>
}


