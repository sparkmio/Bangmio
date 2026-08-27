import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { VueAnimeDetail } from '@/components/vue-anime-detail'
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

  return <VueAnimeDetail subject={subject} relations={relations} characters={characters} persons={persons} episodes={episodes} infobox={infobox} />
}
