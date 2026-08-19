'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
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

function Arrow() { return <span aria-hidden="true">→</span> }

function HomeCover({ subject }: { subject: Subject }) {
  const image = imageUrl(subject.images)
  return <div className="cover">
    {image ? <img src={image} alt={displayName(subject)} loading="lazy" decoding="async" /> : <div className="cover-fallback"><span>Bangmio</span></div>}
    <div className="cover-orbit" />
    <strong className="cover-mark">{subject.rank ? `#${subject.rank}` : 'ANIME'}</strong>
  </div>
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
      .catch(() => { if (alive) setWatchingError('加载在追列表失败') })
      .finally(() => { if (alive) setWatchingLoading(false) })
    return () => { alive = false }
  }, [isAuthenticated, request, retry, watchingType])

  const selected = useMemo(() => watchingList.find(item => item.id === selectedId) || watchingList[0] || null, [selectedId, watchingList])
  const watched = Number(selected?.ep_status || 0)
  const total = Number(selected?.total_episodes || 0)
  const episodeCount = Math.min(total || Math.max(watched, 12), 24)

  return <section className="content-section watching-section">
    <div className="section-heading"><div><p className="eyebrow">YOUR LIBRARY</p><h2>正在追番</h2></div><Link className="text-link" href="/watching">查看全部 <Arrow /></Link></div>
    <div className="filter-row">{typeTabs.map(tab => <button key={tab.value} className={`filter-button ${watchingType === tab.value ? 'active' : ''}`} onClick={() => setWatchingType(tab.value)} type="button">{tab.label}</button>)}</div>
    {watchingLoading ? <div className="page-panel async-state">正在加载你的追番列表…</div> : null}
    {watchingError ? <div className="page-panel async-state error-text">{watchingError}<button className="soft-button" type="button" onClick={() => setRetry(value => value + 1)}>重试</button></div> : null}
    {!watchingLoading && !watchingError && watchingList.length ? <div className="watching-layout page-panel">
      <div className="watching-list">{watchingList.map(item => { const image = imageUrl(item.images); return <button key={item.id} className={`watching-item ${selected?.id === item.id ? 'active' : ''}`} onClick={() => setSelectedId(item.id)} type="button">{image ? <img src={image} alt="" /> : <span className="watching-placeholder">✦</span>}<span><strong>{displayName(item)}</strong><small>已看 {Number(item.ep_status || 0)} / {Number(item.total_episodes || 0) || '?'}</small></span></button> })}</div>
      {selected ? <article className="watching-detail"><div className="watching-heading">{imageUrl(selected.images) ? <img src={imageUrl(selected.images)} alt={displayName(selected)} /> : null}<div><p className="eyebrow">CONTINUE WATCHING</p><h3>{displayName(selected)}</h3>{selected.name && selected.name !== selected.name_cn ? <p>{selected.name}</p> : null}<Link className="text-link" href={`/anime/${selected.id}`}>进入详情 <Arrow /></Link></div></div><div className="progress-copy">播放进度 <strong>{watched}</strong> / {total || '?'}</div><div className="episode-grid">{Array.from({ length: episodeCount }, (_, index) => index + 1).map(ep => <span className={ep <= watched ? 'watched' : ''} key={ep}>{String(ep).padStart(2, '0')}</span>)}</div></article> : null}
    </div> : null}
    {!watchingLoading && !watchingError && !watchingList.length ? <div className="page-panel async-state"><p>还没有在追的内容</p><Link className="text-link" href="/anime">去探索番剧 <Arrow /></Link></div> : null}
  </section>
}

function GuestHero() {
  return <section className="welcome-card">
    <div className="welcome-orb orb-one" /><div className="welcome-orb orb-two" /><div className="welcome-grid" />
    <div className="welcome-copy"><span className="pill">✦ 一站式追番社区</span><h2>你的下一部<br /><em>心动番剧</em>，从这里开始。</h2><p>聚合 Bangumi、豆瓣、B 站等平台数据，在这里发现作品、管理收藏，也和同好一起讨论。</p><div className="welcome-actions"><Link className="primary-button" href="/anime">开始探索 <Arrow /></Link><Link className="ghost-button" href="/register">创建账号</Link></div></div>
    <div className="welcome-visual" aria-hidden="true"><div className="visual-card card-back"><span>ANIME</span></div><div className="visual-card card-mid"><span>LIST</span></div><div className="visual-card card-front"><strong>把喜欢的作品<br />都收进来</strong><small>收藏 · 评分 · 吐槽</small></div><div className="floating-note">✦ 今日推荐</div></div>
  </section>
}

function QuickLinks() {
  const links = [{ href: '/anime', icon: '⌕', tone: 'pink', title: '找一部番', description: '搜索动画、书籍和作品' }, { href: '/trending', icon: '◷', tone: 'purple', title: '新番时间表', description: '看看本季正在播什么' }, { href: '/groups', icon: '◎', tone: 'blue', title: '加入小组', description: '和同好聊喜欢的作品' }]
  return <section className="quick-section"><div className="section-heading"><div><p className="eyebrow">EXPLORE</p><h2>从这里开始</h2></div><Link className="text-link" href="/about">了解 Bangmio <Arrow /></Link></div><div className="quick-grid">{links.map(link => <Link className="quick-card" href={link.href} key={link.href}><span className={`quick-icon ${link.tone}`}>{link.icon}</span><span className="quick-text"><strong>{link.title}</strong><small>{link.description}</small></span><span className="quick-arrow">→</span></Link>)}</div></section>
}

function SearchBar() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  function submit(event: React.FormEvent) { event.preventDefault(); if (query.trim()) router.push(`/anime?q=${encodeURIComponent(query.trim())}`); else router.push('/anime') }
  return <form className="search-box" onSubmit={submit}><span aria-hidden="true">⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索番剧、人物或小组" aria-label="搜索番剧、人物或小组" /><kbd>⌘ K</kbd></form>
}

export function HomeClient({ initialHot }: { initialHot: Subject[] }) {
  const { ready, isAuthenticated } = useAuth()
  const [hot, setHot] = useState(initialHot)
  useEffect(() => { if (initialHot.length) return; let alive = true; void fetch('/api/v1/anime/browse?sort=heat&type=2&limit=12').then(response => response.json()).then(payload => { if (alive && Array.isArray(payload?.data)) setHot(payload.data) }).catch(() => undefined); return () => { alive = false } }, [initialHot.length])
  return <>
    <div className="topbar"><div><p className="eyebrow">WELCOME BACK</p><h1>发现、记录、分享你的番剧世界</h1></div><div className="top-actions"><SearchBar />{!isAuthenticated ? <Link className="login-button" href="/login">登录</Link> : <Link className="login-button" href="/profile">我的主页</Link>}</div></div>
    {ready && isAuthenticated ? <WatchingPanel /> : <GuestHero />}
    <QuickLinks />
    <section className="content-section"><div className="section-heading"><div><p className="eyebrow">TRENDING NOW</p><h2>大家都在看</h2></div><Link className="text-link" href="/trending">探索更多 <Arrow /></Link></div>{hot.length ? <div className="anime-grid">{hot.slice(0, 8).map(subject => <Link className="anime-card" href={`/anime/${subject.id}`} key={subject.id}><HomeCover subject={subject} /><div className="anime-info"><strong>{displayName(subject)}</strong>{subject.name && subject.name !== subject.name_cn ? <small>{subject.name}</small> : <small>热门作品</small>}<span>{subject.rating?.score ? `★ ${Number(subject.rating.score).toFixed(1)}` : '查看详情 →'}</span></div></Link>)}</div> : <div className="empty-search">暂时没有热门作品</div>}</section>
    <section className="schedule-section"><div className="section-heading"><div><p className="eyebrow">ON AIR</p><h2>新番时间表</h2></div><Link className="text-link" href="/trending">完整时间表 <Arrow /></Link></div><div className="schedule-grid"><div className="schedule-day today"><div className="day-head"><span>今天</span><small>正在播出</small></div><Link className="schedule-item" href="/trending"><span className="schedule-dot" />查看今日更新 <span>→</span></Link><Link className="schedule-item" href="/anime"><span className="schedule-dot" />探索更多新番 <span>→</span></Link></div><div className="schedule-day"><div className="day-head"><span>本周</span><small>番剧推荐</small></div><Link className="schedule-item" href="/trending"><span className="schedule-dot" />本季热门作品 <span>→</span></Link><Link className="schedule-item" href="/anime"><span className="schedule-dot" />按类型浏览 <span>→</span></Link></div><div className="schedule-day"><div className="day-head"><span>社区</span><small>一起讨论</small></div><Link className="schedule-item" href="/groups"><span className="schedule-dot" />最新小组话题 <span>→</span></Link><Link className="schedule-item" href="/groups"><span className="schedule-dot" />寻找同好 <span>→</span></Link></div><div className="schedule-day schedule-tip"><div className="day-head"><span>小贴士</span><small>Bangmio</small></div><p>登录后可以同步收藏和追番进度。</p><Link className="text-link" href={isAuthenticated ? '/profile' : '/login'}>{isAuthenticated ? '查看我的资料' : '登录开始'} <Arrow /></Link></div></div></section>
    <footer><span>© 2026 Bangmio</span><span>聚合多平台数据 · 让追番更简单</span><span className="footer-links"><Link href="/about">关于我们</Link><Link href="/groups">社区</Link></span></footer>
  </>
}
