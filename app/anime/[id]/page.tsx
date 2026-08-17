import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CollectionButton, CollectionEditor } from '@/components/collection-button'
import { AnimeGrid } from '@/components/anime-card'
import { SectionHeading } from '@/components/ui'
import { displayName, imageUrl, safeApiFetch } from '@/lib/api'
import type { ImageSet, Subject } from '@/lib/types'

type DetailData = Subject & { relations?: Subject[] }
type Episode = { id?: number; sort?: number; name?: string; name_cn?: string; airdate?: string; duration?: string }
type Credit = { id?: number; name?: string; name_cn?: string; relation?: string; career?: string[]; images?: ImageSet }

function arrayData<T>(value: { data?: T } | null) {
  return Array.isArray(value?.data) ? value.data : []
}

function displayValue(value: unknown) {
  if (Array.isArray(value)) return value.map(item => typeof item === 'string' ? item : JSON.stringify(item)).join(' / ')
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return value ? JSON.stringify(value) : ''
}

function PersonStrip({ people, kind }: { people: Credit[]; kind: 'character' | 'person' }) {
  if (!people.length) return <div className="panel empty-state compact-empty"><h3>暂无{kind === 'character' ? '角色' : '制作人员'}资料</h3></div>
  return <div className="people-strip">
    {people.slice(0, 24).map((person, index) => {
      const name = person.name_cn || person.name || '未命名'
      const image = imageUrl(person.images)
      return <Link className="person-chip" href={`/${kind}/${person.id || index}`} key={person.id || `${name}-${index}`}>
        {image ? <img src={image} alt="" loading="lazy" /> : <span className="avatar">{name.slice(0, 1)}</span>}
        <span><strong>{name}</strong><small>{person.relation || person.career?.[0] || (kind === 'character' ? '角色' : '制作人员')}</small></span>
      </Link>
    })}
  </div>
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const response = await safeApiFetch<Subject>(`/anime/${id}`)
  return {
    title: response?.data ? displayName(response.data) : '番组详情',
    description: response?.data?.summary || '查看番组资料、评分、收藏和讨论。'
  }
}

export default async function AnimeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const detail = await safeApiFetch<DetailData>(`/anime/${id}`)
  if (!detail?.data) notFound()

  const subject = detail.data
  const [relationsResponse, charactersResponse, personsResponse, episodesResponse] = await Promise.all([
    safeApiFetch<Subject[]>(`/anime/${id}/relations`),
    safeApiFetch<Credit[]>(`/anime/${id}/characters`),
    safeApiFetch<Credit[]>(`/anime/${id}/persons`),
    safeApiFetch<Episode[]>(`/anime/${id}/episodes`)
  ])
  const relations = arrayData(relationsResponse).filter((item: Subject) => item.type !== 3)
  const characters = arrayData(charactersResponse)
  const persons = arrayData(personsResponse)
  const episodes = arrayData(episodesResponse)
  const image = imageUrl(subject.images)
  const ratingCount = subject.rating?.count || {}
  const ratingMax = Math.max(1, ...Object.values(ratingCount).map(Number))
  const infobox = Array.isArray(subject.infobox) ? subject.infobox.filter(item => item?.key && displayValue(item.value)) : []

  return <>
    <div className="detail-hero panel">
      {image ? <img className="detail-cover" src={image} alt={displayName(subject)} /> : <div className="detail-cover cover-placeholder">B</div>}
      <div className="detail-content">
        <div className="eyebrow">Subject #{subject.id}</div>
        <h1>{displayName(subject)}</h1>
        {subject.name && subject.name_cn && subject.name !== subject.name_cn ? <p className="detail-original">{subject.name}</p> : null}
        <div className="tags">{(subject.tags || []).slice(0, 8).map((tag: any) => <span className="tag" key={tag.name}>{tag.name}</span>)}</div>
        <p className="detail-summary">{subject.summary || '暂无简介。'}</p>
        <div className="detail-actions"><CollectionButton animeId={subject.id} /><Link className="button ghost" href={`/anime/${subject.id}/topics`}>查看讨论</Link></div>
        <div className="stats-row">
          <div className="stat"><strong>{subject.rating?.score ? Number(subject.rating.score).toFixed(1) : '—'}</strong><span>社区评分</span></div>
          <div className="stat"><strong>{subject.rating?.rank ? `#${subject.rating.rank}` : '—'}</strong><span>排名</span></div>
          <div className="stat"><strong>{subject.eps_count || subject.eps || '—'}</strong><span>总集数</span></div>
          <div className="stat"><strong>{subject.date || subject.air_date || '—'}</strong><span>首播日期</span></div>
        </div>
      </div>
    </div>

    <CollectionEditor animeId={subject.id} />

    <section className="detail-sections">
      <SectionHeading eyebrow="Overview" title="作品资料" description="来自 Bangumi 的条目资料与收藏分布。" />
      <div className="detail-two-column">
        <article className="panel detail-panel"><h3>基本信息</h3>{infobox.length ? <dl className="info-list">{infobox.slice(0, 20).map((item, index) => <div key={`${item.key}-${index}`}><dt>{item.key}</dt><dd>{displayValue(item.value)}</dd></div>)}</dl> : <p className="muted-copy">暂无更详细的条目信息。</p>}</article>
        <article className="panel detail-panel"><h3>评分分布</h3><div className="rating-summary"><strong>{subject.rating?.score ? Number(subject.rating.score).toFixed(1) : '—'}</strong><span>{subject.rating?.total || 0} 人评分</span></div><div className="rating-bars">{[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(score => <div className="rating-bar" key={score}><span>{score}</span><i><b style={{ width: `${(Number(ratingCount[String(score)] || 0) / ratingMax) * 100}%` }} /></i><em>{Number(ratingCount[String(score)] || 0)}</em></div>)}</div></article>
      </div>
    </section>

    <section className="detail-sections">
      <SectionHeading eyebrow="Episodes" title="章节" description={episodes.length ? `共加载 ${episodes.length} 条章节资料。` : '暂无章节资料。'} />
      {episodes.length ? <div className="panel episode-list">{episodes.slice(0, 100).map((episode, index) => <div className="episode-row" key={episode.id || index}><span>{String(episode.sort || index + 1).padStart(2, '0')}</span><div><strong>{episode.name_cn || episode.name || `第 ${episode.sort || index + 1} 话`}</strong><small>{episode.airdate || '播出日期未知'}</small></div><em>{episode.duration || ''}</em></div>)}</div> : <div className="panel empty-state compact-empty"><h3>暂无章节信息</h3></div>}
    </section>

    <section className="detail-sections">
      <SectionHeading eyebrow="Cast" title="角色" description={`${characters.length} 位角色`} />
      <PersonStrip people={characters} kind="character" />
    </section>

    <section className="detail-sections">
      <SectionHeading eyebrow="Staff" title="制作人员" description={`${persons.length} 位制作人员`} />
      <PersonStrip people={persons} kind="person" />
    </section>

    <section className="detail-sections">
      <SectionHeading eyebrow="Relations" title="关联条目" description="同一作品宇宙中的其他条目。" />
      {relations.length ? <AnimeGrid subjects={relations} empty="暂无关联条目" /> : <div className="panel empty-state compact-empty"><h3>暂无关联条目</h3><p>这部作品暂时没有可展示的关联条目。</p></div>}
    </section>

    <section className="detail-sections">
      <SectionHeading eyebrow="Community" title="制作与讨论" description="和同好一起补完这部作品。" />
      <div className="feature-grid"><div className="panel feature"><div className="feature-icon">⌁</div><h3>吐槽箱</h3><p>和同好聊聊这部作品。</p><Link className="text-link" href={`/anime/${subject.id}/talkbox`}>进入讨论 →</Link></div><div className="panel feature"><div className="feature-icon">▤</div><h3>话题</h3><p>浏览条目相关的长讨论。</p><Link className="text-link" href={`/anime/${subject.id}/topics`}>查看话题 →</Link></div></div>
    </section>
  </>
}
