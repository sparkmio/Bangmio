import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AnimeDetail } from '@/components/anime-detail'
import { displayName } from '@/lib/api'
import { apiFetchServer, safeApiFetchServer } from '@/lib/api-server'
import { detailTabFrom } from '@/lib/detail-tabs'
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
  const response = await safeApiFetchServer<Subject>(`/anime/${id}`)
  return {
    title: response?.data ? displayName(response.data) : '番组详情',
    description: response?.data?.summary || '查看番组资料、评分、收藏和讨论。'
  }
}

export default async function AnimeDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ tab?: string | string[] }>
}) {
  const { id } = await params
  const { tab } = (await searchParams) ?? {}
  const initialTab = detailTabFrom(Array.isArray(tab) ? tab[0] : tab)
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) notFound()
  const detail = await apiFetchServer<DetailData>(`/anime/${id}`).catch(
    (error: Error & { status?: number }) => {
      if (error.status === 404) notFound()
      throw error
    }
  )
  if (!detail.data) throw new Error('条目资料返回异常，请重试')

  const subject = detail.data
  const [relationsResponse, charactersResponse, personsResponse, episodesResponse] =
    await Promise.all([
      safeApiFetchServer<Subject[]>(`/anime/${id}/relations`),
      safeApiFetchServer<Credit[]>(`/anime/${id}/characters`),
      safeApiFetchServer<Credit[]>(`/anime/${id}/persons`),
      safeApiFetchServer<Episode[]>(`/anime/${id}/episodes`)
    ])
  const relations = arrayData(relationsResponse)
  const characters = arrayData(charactersResponse)
  const persons = arrayData(personsResponse)
  const episodes = arrayData(episodesResponse)
  const staleData =
    detail.stale === true ||
    [relationsResponse, charactersResponse, personsResponse, episodesResponse].some(
      response => response?.stale === true
    )
  const infobox = Array.isArray(subject.infobox)
    ? subject.infobox.filter(item => item?.key && displayValue(item.value))
    : []

  return (
    <AnimeDetail
      subject={subject}
      relations={relations}
      characters={characters}
      persons={persons}
      episodes={episodes}
      staleData={staleData}
      episodeTotal={episodesResponse?.total || episodes.length}
      episodesFailed={!episodesResponse}
      failedSections={[
        ...(!charactersResponse ? ['characters' as const] : []),
        ...(!personsResponse ? ['staff' as const] : []),
        ...(!relationsResponse ? ['relations' as const] : [])
      ]}
      infobox={infobox}
      initialTab={initialTab}
    />
  )
}
