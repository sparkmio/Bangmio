import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { VueAnimeDetail } from '@/components/vue-anime-detail'
import { apiFetch, displayName, safeApiFetch } from '@/lib/api'
import type { ImageSet, Subject } from '@/lib/types'

type DetailData = Subject & { relations?: Subject[] }
type Episode = {
  id?: number
  sort?: number
  name?: string
  name_cn?: string
  airdate?: string
  duration?: string
}
type Credit = {
  id?: number
  name?: string
  name_cn?: string
  relation?: string
  career?: string[]
  images?: ImageSet
}

function arrayData<T>(value: { data?: T } | null) {
  return Array.isArray(value?.data) ? value.data : []
}

function displayValue(value: unknown) {
  if (Array.isArray(value))
    return value.map(item => (typeof item === 'string' ? item : JSON.stringify(item))).join(' / ')
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return value ? JSON.stringify(value) : ''
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const response = await safeApiFetch<Subject>(`/anime/${id}`)
  return {
    title: response?.data ? displayName(response.data) : '番组详情',
    description: response?.data?.summary || '查看番组资料、评分、收藏和讨论。'
  }
}

export default async function AnimeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) notFound()
  const detail = await apiFetch<DetailData>(`/anime/${id}`).catch(
    (error: Error & { status?: number }) => {
      if (error.status === 404) notFound()
      throw error
    }
  )
  if (!detail.data) throw new Error('条目资料返回异常，请重试')

  const subject = detail.data
  const [relationsResponse, charactersResponse, personsResponse, episodesResponse] =
    await Promise.all([
      safeApiFetch<Subject[]>(`/anime/${id}/relations`),
      safeApiFetch<Credit[]>(`/anime/${id}/characters`),
      safeApiFetch<Credit[]>(`/anime/${id}/persons`),
      safeApiFetch<Episode[]>(`/anime/${id}/episodes`)
    ])
  const relations = arrayData(relationsResponse)
  const characters = arrayData(charactersResponse)
  const persons = arrayData(personsResponse)
  const episodes = arrayData(episodesResponse)
  const infobox = Array.isArray(subject.infobox)
    ? subject.infobox.filter(item => item?.key && displayValue(item.value))
    : []

  return (
    <VueAnimeDetail
      subject={subject}
      relations={relations}
      characters={characters}
      persons={persons}
      episodes={episodes}
      episodeTotal={episodesResponse?.total || episodes.length}
      episodesFailed={!episodesResponse}
      failedSections={[
        ...(!charactersResponse ? ['characters' as const] : []),
        ...(!personsResponse ? ['staff' as const] : []),
        ...(!relationsResponse ? ['relations' as const] : [])
      ]}
      infobox={infobox}
    />
  )
}
