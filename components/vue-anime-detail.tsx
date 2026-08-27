'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { CollectionButton, CollectionEditor } from './collection-button'
import { AnimeGrid } from './anime-card'
import { displayName, imageUrl } from '@/lib/api'
import type { ApiResult, ImageSet, Subject } from '@/lib/types'

type Episode = { id?: number; sort?: number; name?: string; name_cn?: string; airdate?: string; duration?: string }
type Credit = { id?: number; name?: string; name_cn?: string; relation?: string; career?: string[]; images?: ImageSet }
type InfoboxItem = { key?: string; value?: unknown }
type Props = { subject: Subject; relations: Subject[]; characters: Credit[]; persons: Credit[]; episodes: Episode[]; infobox: InfoboxItem[] }
type TabKey = 'overview' | 'episodes' | 'characters' | 'staff' | 'relations' | 'talkbox' | 'topics' | 'douban' | 'music' | 'streaming' | 'moegirl' | 'wiki'
type DoubanData = { id?: string | number; title?: string; rate?: string | number; url?: string; release_year?: string | number; types?: string[]; episodes_count?: number; short_comment?: { content?: string } | null }
type DoubanComment = { user?: string; rating?: number; time?: string; useful?: number; content?: string }
type DoubanReview = DoubanComment & { title?: string }
type MoegirlSummary = { title?: string; extract?: string; url?: string }
type WikipediaResult = { title?: string; description?: string; url?: string }
type MusicResult = { id?: number | string; name?: string; name_cn?: string; artists?: string[]; album?: string; url?: string; cover?: string; relation?: string }
type BilibiliData = { title?: string; url?: string; cover?: string; score?: number | null; episodes?: number }

const tabs: Array<[TabKey, string]> = [
  ['overview', '概览'], ['episodes', '章节'], ['characters', '角色'], ['staff', '制作人员'],
  ['relations', '关联'], ['douban', '豆瓣'], ['music', '音乐'], ['streaming', '在线观看'],
  ['moegirl', '萌娘百科'], ['wiki', 'Wiki'], ['talkbox', '吐槽'], ['topics', '讨论版']
]

function valueText(value: unknown) {
  if (Array.isArray(value)) return value.map(item => typeof item === 'string' ? item : typeof item === 'object' && item ? JSON.stringify(item) : String(item)).join(' / ')
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return value ? JSON.stringify(value) : ''
}

function importantInfobox(infobox: InfoboxItem[]) {
  const important = /原作|导演|监督|系列构成|脚本|音乐|人物设定|角色设计|制作|制作公司|放送|首播|发行|集数|话数|时长|地区|语言|类型|出版社/i
  return infobox.filter(item => important.test(String(item.key || ''))).slice(0, 8)
}

function apiFetch<T>(path: string) {
  return fetch(`/api/v1${path}`, { headers: { Accept: 'application/json' } }).then(async response => {
    const payload = await response.json().catch(() => ({})) as ApiResult<T>
    if (!response.ok) throw new Error(payload.error || `请求失败 (${response.status})`)
    return payload.data as T
  })
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><span className="w-1 h-5 rounded-full bg-primary" />{children}</h2>
}

function Empty({ children = '暂无资料' }: { children?: ReactNode }) {
  return <div className="py-10 text-center text-sm text-base-content/40">{children}</div>
}

function Credits({ items, kind }: { items: Credit[]; kind: 'character' | 'person' }) {
  if (!items.length) return <Empty>暂无{kind === 'character' ? '角色' : '制作人员'}资料</Empty>
  return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{items.slice(0, 24).map((item, index) => {
    const name = item.name_cn || item.name || '未命名'
    const image = imageUrl(item.images)
    return <Link href={`/${kind}/${item.id || index}`} key={item.id || `${name}-${index}`} className="flex items-center gap-3 rounded-xl bg-base-200/40 p-2 hover:bg-base-200 transition-colors"><div className="w-10 h-10 rounded-full overflow-hidden bg-base-300 shrink-0">{image ? <img src={image} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" /> : <div className="w-full h-full flex items-center justify-center text-sm text-base-content/50">{name.slice(0, 1)}</div>}</div><div className="min-w-0"><p className="text-sm font-medium truncate">{name}</p><p className="text-xs text-base-content/50 truncate">{item.relation || item.career?.[0] || (kind === 'character' ? '角色' : '制作人员')}</p></div></Link>
  })}</div>
}

function RatingChart({ subject }: { subject: Subject }) {
  const counts = subject.rating?.count || {}
  const max = Math.max(1, ...Object.values(counts).map(Number))
  return <div className="rounded-xl bg-base-200/40 p-5"><div className="flex items-center gap-5"><div className="text-center w-20 shrink-0"><p className="text-3xl font-black text-amber-400">{subject.rating?.score ? Number(subject.rating.score).toFixed(1) : '—'}</p><p className="text-xs text-base-content/40 mt-1">{subject.rating?.total || 0} 人评分</p></div><div className="flex-1 space-y-1.5">{Array.from({ length: 10 }, (_, index) => 10 - index).map(score => <div key={score} className="flex items-center gap-2 text-xs"><span className="w-4 text-right text-base-content/40">{score}</span><div className="flex-1 h-1.5 rounded-full overflow-hidden bg-base-300/60"><div className="h-full rounded-full bg-primary" style={{ width: `${(Number(counts[score] || 0) / max) * 100}%` }} /></div><span className="w-8 text-right text-base-content/40">{counts[score] || 0}</span></div>)}</div></div></div>
}

function CollectionChart({ subject }: { subject: Subject }) {
  const collection = subject.collection || {}
  const items: Array<[string, string, string]> = [['wish', '想看', 'text-blue-400'], ['doing', '在追', 'text-emerald-400'], ['collect', '看过', 'text-primary'], ['dropped', '弃番', 'text-red-400']]
  return <div className="rounded-xl bg-base-200/40 p-5"><h3 className="font-semibold text-sm text-base-content/80 mb-4">收藏统计</h3><div className="grid grid-cols-2 gap-3">{items.map(([key, label, color]) => <div key={key} className="text-center p-3 rounded-lg bg-base-300/30"><p className={`text-xl font-bold ${color}`}>{Number(collection[key] || 0).toLocaleString()}</p><p className="text-xs mt-1 text-base-content/40">{label}</p></div>)}</div></div>
}

function ExternalLinks({ subject, douban, bilibili }: { subject: Subject; douban?: DoubanData | null; bilibili?: BilibiliData | null }) {
  const title = displayName(subject)
  const links: Array<[string, string]> = [
    ['Bangumi 条目', `https://bangumi.tv/subject/${subject.id}`],
    ['豆瓣', douban?.url || `https://www.douban.com/search?q=${encodeURIComponent(title)}`],
    ['网易云音乐', `https://music.163.com/#/search/m/?s=${encodeURIComponent(title)}`],
    ['B 站', bilibili?.url || `https://search.bilibili.com/bangumi?keyword=${encodeURIComponent(title)}`],
    ['girigirilove', `https://ani.girigirilove.com/search/-------------.html?wd=${encodeURIComponent(title)}`],
    ['萌娘百科', `https://zh.moegirl.org.cn/index.php?search=${encodeURIComponent(title)}`],
    ['Wikipedia', `https://zh.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(title)}`]
  ]
  return <section><SectionTitle>外部链接</SectionTitle><div className="flex flex-wrap gap-2">{links.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost border border-base-300/70">{label} ↗</a>)}</div><p className="text-xs text-base-content/35 mt-3">外部网站内容由对应站点提供，本站只保留跳转入口。</p></section>
}

function EmbedFrame({ src, title, fallbackHref = src }: { src: string; title: string; fallbackHref?: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <div className="rounded-xl border border-base-300 bg-base-200/30 p-6 text-center"><p className="text-sm text-base-content/50 mb-3">页面暂时无法嵌入</p><a className="btn btn-sm btn-primary" href={fallbackHref} target="_blank" rel="noopener noreferrer">打开原页面 ↗</a></div>
  return <iframe title={title} src={src} sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" className="w-full min-h-[620px] rounded-xl border border-base-300 bg-white" loading="lazy" onError={() => setFailed(true)} />
}

function DoubanPanel({ subject }: { subject: Subject }) {
  const title = displayName(subject)
  const [loading, setLoading] = useState(true)
  const [details, setDetails] = useState<DoubanData | null>(null)
  const [summary, setSummary] = useState<{ intro?: string } | null>(null)
  const [comments, setComments] = useState<DoubanComment[]>([])
  const [reviews, setReviews] = useState<DoubanReview[]>([])
  useEffect(() => {
    let alive = true
    setLoading(true); setDetails(null); setSummary(null); setComments([]); setReviews([])
    void apiFetch<DoubanData>(`/douban/by-name?name=${encodeURIComponent(title)}`).then(data => {
      if (!alive) return
      setDetails(data || null)
      if (!data?.id) return null
      return Promise.all([
        apiFetch<{ intro?: string }>(`/douban/${data.id}/summary`).catch(() => null),
        apiFetch<DoubanComment[]>(`/douban/${data.id}/comments`).catch(() => []),
        apiFetch<DoubanReview[]>(`/douban/${data.id}/reviews`).catch(() => [])
      ]).then(([nextSummary, nextComments, nextReviews]) => {
        if (!alive) return
        setSummary(nextSummary); setComments(nextComments || []); setReviews(nextReviews || [])
      })
    }).catch(() => { if (alive) setDetails(null) }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [title])
  if (loading) return <Empty>正在加载豆瓣资料…</Empty>
  if (!details?.id) return <div className="text-center py-10"><p className="text-sm text-base-content/40 mb-3">未找到豆瓣条目</p><a className="btn btn-sm btn-ghost" href={`https://www.douban.com/search?q=${encodeURIComponent(title)}`} target="_blank" rel="noopener noreferrer">前往豆瓣搜索 ↗</a></div>
  const stars = Math.min(5, Math.max(0, Math.round(Number(details.rate || 0) / 2)))
  const doubanUrl = details.url || `https://www.douban.com/search?q=${encodeURIComponent(title)}`
  return <div className="space-y-5"><div className="rounded-xl bg-base-200/40 p-5"><div className="flex flex-wrap items-baseline gap-3"><h2 className="text-xl font-bold flex-1">{details.title || title}</h2><span className="text-4xl font-black text-amber-500">{details.rate || '—'}</span><span className="text-amber-400 tracking-widest">{'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</span></div><p className="text-sm text-base-content/55 mt-2">{[details.release_year ? `${details.release_year} 年` : '', details.types?.join(' / '), details.episodes_count ? `${details.episodes_count} 集` : ''].filter(Boolean).join(' · ')}</p>{summary?.intro || details.short_comment?.content ? <p className="mt-4 border-l-4 border-amber-500/60 rounded-r-lg bg-base-100/60 p-4 text-sm leading-relaxed whitespace-pre-line">{summary?.intro || details.short_comment?.content}</p> : null}<div className="flex flex-wrap gap-2 mt-5"><a className="btn btn-sm btn-primary" href={doubanUrl} target="_blank" rel="noopener noreferrer">前往豆瓣查看 ↗</a><a className="btn btn-sm btn-ghost" href={`/api/v1/douban/page/${details.id}`} target="_blank" rel="noopener noreferrer">打开内嵌页面 ↗</a></div></div>{comments.length ? <section><SectionTitle>短评</SectionTitle><div className="space-y-3">{comments.slice(0, 8).map((comment, index) => <article key={`${comment.user}-${index}`} className="rounded-lg bg-base-200/40 p-3"><p className="text-xs text-base-content/50 mb-1">{comment.user || '匿名用户'} {comment.time ? `· ${comment.time}` : ''}</p><p className="text-sm leading-relaxed whitespace-pre-line">{comment.content}</p></article>)}</div></section> : null}{reviews.length ? <section><SectionTitle>长评</SectionTitle><div className="space-y-3">{reviews.slice(0, 5).map((review, index) => <article key={`${review.title}-${index}`} className="rounded-lg bg-base-200/40 p-4"><h3 className="font-medium">{review.title || '豆瓣长评'}</h3><p className="text-xs text-base-content/50 my-1">{review.user || '匿名用户'} {review.time ? `· ${review.time}` : ''}</p><p className="text-sm leading-relaxed whitespace-pre-line">{review.content}</p></article>)}</div></section> : null}<EmbedFrame src={`/api/v1/douban/page/${details.id}`} title="豆瓣条目内嵌页面" fallbackHref={doubanUrl} /></div>
}

function MusicPanel({ subject, musicRelations }: { subject: Subject; musicRelations: Subject[] }) {
  const title = displayName(subject)
  const [results, setResults] = useState<MusicResult[]>([])
  useEffect(() => { if (musicRelations.length) return; let alive = true; void apiFetch<{ results?: MusicResult[] }>(`/music/search?q=${encodeURIComponent(title)}`).then(data => { if (alive) setResults(data?.results || []) }).catch(() => undefined); return () => { alive = false } }, [musicRelations.length, title])
  const items: MusicResult[] = musicRelations.length
    ? musicRelations.map(item => ({ id: item.id, name: item.name, name_cn: item.name_cn, relation: String(item.relation || '') }))
    : results
  if (!items.length) return <div className="space-y-4"><Empty>暂无相关音乐</Empty><div className="flex justify-center gap-2"><a className="btn btn-sm btn-ghost" href={`https://music.163.com/#/search/m/?s=${encodeURIComponent(title)}`} target="_blank" rel="noopener noreferrer">网易云搜索 ↗</a><a className="btn btn-sm btn-ghost" href={`https://search.bilibili.com/all?keyword=${encodeURIComponent(title)}`} target="_blank" rel="noopener noreferrer">B站搜索 ↗</a></div></div>
  return <div className="space-y-4"><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{items.slice(0, 18).map((item, index) => { const name = item.name_cn || item.name || '未命名音乐'; const artists = item.artists?.join(' / ') || item.album || item.relation || ''; return <article key={item.id || `${name}-${index}`} className="rounded-xl bg-base-200/40 p-4"><p className="font-medium">{name}</p>{artists ? <p className="text-xs text-base-content/50 mt-1">{artists}</p> : null}{item.url ? <a className="link link-primary text-xs mt-3 inline-block" href={item.url} target="_blank" rel="noopener noreferrer">打开音乐 ↗</a> : null}</article> })}</div><div className="flex justify-end"><a className="btn btn-sm btn-ghost" href={`https://music.163.com/#/search/m/?s=${encodeURIComponent(title)}`} target="_blank" rel="noopener noreferrer">在网易云搜索更多 ↗</a></div></div>
}

function StreamingPanel({ subject }: { subject: Subject }) {
  const title = displayName(subject)
  const [bilibili, setBilibili] = useState<BilibiliData | null>(null)
  useEffect(() => { let alive = true; void apiFetch<BilibiliData>(`/bilibili/by-name?name=${encodeURIComponent(title)}`).then(data => { if (alive) setBilibili(data || null) }).catch(() => undefined); return () => { alive = false } }, [title])
  return <div className="space-y-3"><a className="btn btn-primary w-full" href={bilibili?.url || `https://search.bilibili.com/bangumi?keyword=${encodeURIComponent(title)}`} target="_blank" rel="noopener noreferrer">{bilibili?.url ? `前往 B 站观看《${bilibili.title || title}》` : `在 B 站搜索《${title}》`} ↗</a><a className="btn btn-outline w-full" href={`https://ani.girigirilove.com/search/-------------.html?wd=${encodeURIComponent(title)}`} target="_blank" rel="noopener noreferrer">前往 girigirilove 搜索观看 ↗</a><p className="text-xs text-base-content/35 text-center mt-4">点击跳转至第三方网站，本站不存储视频内容。</p></div>
}

function MoegirlPanel({ subject }: { subject: Subject }) {
  const names = [...new Set([subject.name_cn, subject.name].filter(Boolean).map(String))]
  const [loading, setLoading] = useState(true)
  const [pageName, setPageName] = useState('')
  const [summary, setSummary] = useState<MoegirlSummary | null>(null)
  useEffect(() => {
    let alive = true
    setLoading(true); setPageName(''); setSummary(null)
    const findPage = async () => {
      for (const name of names) {
        const data = await apiFetch<{ results?: Array<{ title?: string }> }>(`/moegirl/search?q=${encodeURIComponent(name)}`).catch(() => null)
        if (data?.results?.[0]?.title) { if (alive) setPageName(data.results[0].title); return }
      }
    }
    void findPage().finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [names.join('|')])
  useEffect(() => { if (!pageName) return; let alive = true; void apiFetch<MoegirlSummary>(`/moegirl/${encodeURIComponent(pageName)}/summary`).then(data => { if (alive) setSummary(data || null) }).catch(() => undefined); return () => { alive = false } }, [pageName])
  if (loading) return <Empty>正在搜索萌娘百科…</Empty>
  if (!pageName) return <div className="text-center py-10"><p className="text-sm text-base-content/40 mb-3">未找到萌娘百科条目</p><a className="btn btn-sm btn-ghost" href={`https://zh.moegirl.org.cn/index.php?search=${encodeURIComponent(names[0] || '')}`} target="_blank" rel="noopener noreferrer">前往萌娘百科搜索 ↗</a></div>
  const moegirlUrl = summary?.url || `https://zh.moegirl.org.cn/${encodeURIComponent(pageName)}`
  return <div className="space-y-4">{summary?.extract ? <div className="rounded-xl bg-base-200/40 p-4"><div className="flex justify-between gap-3"><h3 className="font-semibold">{summary.title || pageName}</h3><a className="link link-primary text-sm" href={moegirlUrl} target="_blank" rel="noopener noreferrer">原站词条 ↗</a></div><p className="text-sm leading-7 text-base-content/75 mt-2 whitespace-pre-line">{summary.extract}</p></div> : null}<EmbedFrame src={`/api/v1/moegirl/page/${encodeURIComponent(pageName)}`} title="萌娘百科完整正文" fallbackHref={moegirlUrl} /></div>
}

function WikiPanel({ subject, infobox }: { subject: Subject; infobox: InfoboxItem[] }) {
  const items = importantInfobox(infobox)
  const names = [...new Set([subject.name_cn, subject.name].filter(Boolean).map(String))]
  const [loading, setLoading] = useState(true)
  const [article, setArticle] = useState<WikipediaResult | null>(null)
  useEffect(() => {
    let alive = true
    setLoading(true); setArticle(null)
    const findArticle = async () => {
      for (const name of names) {
        const data = await apiFetch<{ results?: WikipediaResult[] }>(`/wikipedia/search?q=${encodeURIComponent(name)}`).catch(() => null)
        if (data?.results?.[0]?.title) {
          if (alive) setArticle(data.results[0])
          return
        }
      }
    }
    void findArticle().finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [names.join('|')])
  const fallbackUrl = article?.url || `https://zh.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(names[0] || '')}`
  return <div className="space-y-5">{items.length ? <section><h3 className="font-semibold mb-3">Bangumi Wiki</h3><div className="rounded-xl bg-base-200/40 p-5"><div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">{items.map((item, index) => <div key={`${item.key}-${index}`} className="text-sm"><span className="font-medium text-base-content/50">{item.key}</span><span className="ml-2 text-base-content/75">{valueText(item.value)}</span></div>)}</div></div><a className="btn btn-sm btn-ghost mt-3 w-full" href={`https://bangumi.pro/subject/${subject.id}`} target="_blank" rel="noopener noreferrer">在 Bangumi 查看完整 Wiki ↗</a></section> : null}<section><h3 className="font-semibold mb-3">维基百科</h3>{loading ? <Empty>正在搜索维基百科…</Empty> : article?.title ? <div className="space-y-4">{article.description ? <div className="rounded-xl bg-base-200/40 p-4"><div className="flex items-center justify-between gap-3"><p className="font-medium">{article.title}</p><a className="link link-primary text-sm shrink-0" href={fallbackUrl} target="_blank" rel="noopener noreferrer">原站词条 ↗</a></div><p className="text-sm text-base-content/60 mt-2">{article.description}</p></div> : null}<EmbedFrame src={`/api/v1/wikipedia/page/${encodeURIComponent(article.title)}`} title="维基百科内嵌页面" fallbackHref={fallbackUrl} /></div> : <div className="text-center py-10"><p className="text-sm text-base-content/40 mb-3">未找到维基百科条目</p><a className="btn btn-sm btn-ghost" href={fallbackUrl} target="_blank" rel="noopener noreferrer">前往维基百科搜索 ↗</a></div>}</section></div>
}

export function VueAnimeDetail({ subject, relations, characters, persons, episodes, infobox }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const image = imageUrl(subject.images)
  const title = displayName(subject)
  const typeLabel = subject.type === 2 ? '动画' : subject.type === 1 ? '书籍' : subject.type === 3 ? '音乐' : subject.type === 4 ? '游戏' : '条目'
  const musicRelations = useMemo(() => relations.filter(item => item.type === 3), [relations])
  const nonMusicRelations = useMemo(() => relations.filter(item => item.type !== 3), [relations])
  const infoboxItems = importantInfobox(infobox)
  const primaryMeta = [
    ['类型', typeLabel],
    ['首播', subject.air_date || subject.date || '未知'],
    ['集数', subject.eps || subject.eps_count || '未知'],
    ['排名', subject.rating?.rank ? `#${subject.rating.rank}` : '暂无']
  ]

  return <div className="bm-detail-page">
    <section className="bm-detail-hero">
      <div className="bm-detail-backdrop">{image ? <img src={image} alt="" /> : null}<span /></div>
      <div className="bm-detail-hero-inner">
        <Link href="/anime" className="bm-detail-back">← 返回条目</Link>
        <div className="bm-detail-hero-grid">
          <div className="bm-detail-poster">{image ? <img src={image} alt={title} loading="eager" decoding="async" /> : <div>暂无封面</div>}</div>
          <div className="bm-detail-summary">
            <span className="bm-detail-eyebrow">ANIME DETAIL · {typeLabel.toUpperCase()}</span>
            <h1>{title}</h1>
            {subject.name_cn && subject.name && subject.name_cn !== subject.name ? <p className="bm-detail-original">{subject.name}</p> : null}
            <div className="bm-detail-rating-row">
              {subject.rating?.score ? <strong>★ {Number(subject.rating.score).toFixed(1)}</strong> : <strong>暂无评分</strong>}
              <span>{subject.rating?.total || 0} 人评分</span>
              {subject.rating?.rank ? <span>全站 #{subject.rating.rank}</span> : null}
            </div>
            <p className="bm-detail-summary-copy">{subject.summary || '暂无简介。'}</p>
            <div className="bm-detail-actions"><CollectionButton animeId={subject.id} /></div>
          </div>
        </div>
      </div>
    </section>

    <nav className="bm-detail-tabs" aria-label="条目资料导航">
      <div>{tabs.map(([key, label]) => <button key={key} className={activeTab === key ? 'is-active' : ''} type="button" onClick={() => setActiveTab(key)}>{label}</button>)}</div>
    </nav>

    <div className="bm-detail-content">
      {activeTab === 'overview' ? <div className="bm-detail-layout">
        <div className="bm-detail-main-column">
          <section className="bm-detail-panel bm-detail-intro-panel">
            <div className="bm-detail-panel-heading"><div><span className="bm-detail-eyebrow">OVERVIEW</span><h2>作品简介</h2></div><span className="bm-detail-source">Bangumi</span></div>
            <p className="bm-detail-long-copy">{subject.summary || '暂无简介。'}</p>
            {subject.tags?.length ? <div className="bm-detail-tags">{subject.tags.slice(0, 12).map(tag => <span key={tag.name}>{tag.name}</span>)}</div> : null}
          </section>

          <section className="bm-detail-panel">
            <div className="bm-detail-panel-heading"><div><span className="bm-detail-eyebrow">FACTS</span><h2>条目信息</h2></div></div>
            <dl className="bm-detail-facts">{primaryMeta.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
            {infoboxItems.length ? <div className="bm-detail-production"><h3>制作信息</h3><dl>{infoboxItems.map((item, index) => <div key={`${item.key}-${index}`}><dt>{item.key || '资料'}</dt><dd>{valueText(item.value)}</dd></div>)}</dl></div> : null}
          </section>

          <section className="bm-detail-panel"><ExternalLinks subject={subject} /></section>
        </div>
        <aside className="bm-detail-side-column">
          <section className="bm-detail-panel"><div className="bm-detail-panel-heading"><div><span className="bm-detail-eyebrow">COMMUNITY DATA</span><h2>评分与收藏</h2></div></div><div className="bm-detail-charts"><RatingChart subject={subject} /><CollectionChart subject={subject} /></div></section>
          <CollectionEditor animeId={subject.id} />
        </aside>
      </div>
        : activeTab === 'episodes' ? <section className="bm-detail-panel"><div className="bm-detail-panel-heading"><div><span className="bm-detail-eyebrow">EPISODES</span><h2>章节</h2></div></div>{episodes.length ? <div className="bm-detail-episode-list">{episodes.map((episode, index) => <div key={episode.id || index}><span>{String(episode.sort || index + 1).padStart(2, '0')}</span><div><b>{episode.name_cn || episode.name || `第${episode.sort || index + 1}话`}</b><small>{episode.airdate || '播出日期未知'}</small></div><em>{episode.duration || ''}</em></div>)}</div> : <Empty>暂无章节</Empty>}</section>
        : activeTab === 'characters' ? <section className="bm-detail-panel"><SectionTitle>角色</SectionTitle><Credits items={characters} kind="character" /></section>
        : activeTab === 'staff' ? <section className="bm-detail-panel"><SectionTitle>制作人员</SectionTitle><Credits items={persons} kind="person" /></section>
        : activeTab === 'relations' ? <section className="bm-detail-panel"><SectionTitle>关联条目</SectionTitle>{nonMusicRelations.length ? <AnimeGrid subjects={nonMusicRelations} empty="暂无关联条目" /> : <Empty>暂无关联条目</Empty>}</section>
        : activeTab === 'douban' ? <section className="bm-detail-panel"><DoubanPanel subject={subject} /></section>
        : activeTab === 'music' ? <section className="bm-detail-panel"><SectionTitle>相关音乐</SectionTitle><MusicPanel subject={subject} musicRelations={musicRelations} /></section>
        : activeTab === 'streaming' ? <section className="bm-detail-panel"><SectionTitle>在线观看</SectionTitle><StreamingPanel subject={subject} /></section>
        : activeTab === 'moegirl' ? <section className="bm-detail-panel"><SectionTitle>萌娘百科</SectionTitle><MoegirlPanel subject={subject} /></section>
        : activeTab === 'wiki' ? <section className="bm-detail-panel"><SectionTitle>Wiki</SectionTitle><WikiPanel subject={subject} infobox={infobox} /></section>
        : activeTab === 'talkbox' ? <section className="bm-detail-panel"><SectionTitle>吐槽箱</SectionTitle><p className="text-sm text-base-content/60 mb-4">和同好聊聊这部作品。</p><Link href={`/anime/${subject.id}/talkbox`} className="btn btn-primary">进入吐槽箱</Link></section>
        : <section className="bm-detail-panel"><SectionTitle>讨论版</SectionTitle><p className="text-sm text-base-content/60 mb-4">浏览条目相关的长讨论。</p><Link href={`/anime/${subject.id}/topics`} className="btn btn-primary">查看话题</Link></section>}
    </div>
  </div>
}
