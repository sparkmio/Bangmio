import { requiredPageData, requirePositiveId } from '@/lib/page-data'
import { DataUnavailable } from '@/components/data-unavailable'
import type { Metadata } from 'next'
import Link from 'next/link'
import { safeApiFetch, imageUrl } from '@/lib/api'
import { RichText } from '@/components/rich-text'
export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const response = await safeApiFetch<any>(`/anime/character/${id}`)
  return { title: response?.data?.name || '角色详情' }
}
export default async function CharacterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  requirePositiveId(id)
  const [detail, subjects] = await Promise.all([
    requiredPageData<any>(`/anime/character/${id}`),
    safeApiFetch<any[]>(`/anime/character/${id}/subjects`)
  ])
  const character = detail
  const list = Array.isArray(subjects?.data) ? subjects.data : []
  return (
    <>
      <div className="detail-hero panel">
        <div className="detail-cover cover-placeholder">{character.name?.slice(0, 1) || '人'}</div>
        <div className="detail-content">
          <div className="eyebrow">Character</div>
          <h1>{character.name_cn || character.name}</h1>
          <p className="detail-original">
            {character.name && character.name_cn ? character.name : '角色资料'}
          </p>
          <div className="detail-summary">
            <RichText value={character.info || character.summary} fallback="暂无简介。" />
          </div>
        </div>
      </div>
      <section>
        <h2>出演作品</h2>
        {!subjects ? (
          <DataUnavailable label="出演作品" />
        ) : !list.length ? (
          <div className="panel empty-state">暂无出演作品</div>
        ) : (
          <div className="list-grid">
            {list.map((item: any) => (
              <Link
                className="list-card"
                href={`/anime/${item.id || item.subject_id}`}
                key={item.id || item.subject_id}
              >
                <img className="list-cover" src={imageUrl(item.images) || ''} alt="" />
                <div>
                  <h3>{item.name_cn || item.name || '未命名作品'}</h3>
                  <p>{item.role_name || '出演角色'}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
