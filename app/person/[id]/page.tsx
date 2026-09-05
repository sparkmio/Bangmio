import { requiredPageData, requirePositiveId } from '@/lib/page-data'
import { DataUnavailable } from '@/components/data-unavailable'
import Link from 'next/link'
import { safeApiFetch, imageUrl } from '@/lib/api'
import { RichText } from '@/components/rich-text'

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  requirePositiveId(id)
  const [detail, subjects] = await Promise.all([
    requiredPageData<any>(`/anime/person/${id}`),
    safeApiFetch<any[]>(`/anime/person/${id}/subjects`)
  ])
  const person = detail
  const list = Array.isArray(subjects?.data) ? subjects.data : []
  const portrait = imageUrl(person.images)
  return (
    <>
      <div className="detail-hero panel">
        {portrait ? (
          <img className="detail-cover" src={portrait} alt={person.name || '人物'} />
        ) : (
          <div className="detail-cover cover-placeholder">{person.name?.slice(0, 1) || '人'}</div>
        )}
        <div className="detail-content">
          <div className="eyebrow">Person #{id}</div>
          <h1>{person.name_cn || person.name}</h1>
          <p className="detail-original">
            {person.name && person.name_cn ? person.name : '人物资料'}
          </p>
          <div className="detail-summary">
            <RichText value={person.summary} fallback="暂无简介。" />
          </div>
          <div className="detail-actions">
            <Link className="button primary" href={`/person/${id}/talkbox`}>
              人物吐槽箱
            </Link>
          </div>
        </div>
      </div>
      <section>
        <h2>参与作品</h2>
        {!subjects ? (
          <DataUnavailable label="参与作品" />
        ) : list.length ? (
          <div className="list-grid">
            {list.map((item: any, index: number) => {
              const subjectId = item.id || item.subject_id
              return (
                <Link className="list-card" href={`/anime/${subjectId}`} key={subjectId || index}>
                  {imageUrl(item.images) ? (
                    <img className="list-cover" src={imageUrl(item.images)} alt="" loading="lazy" />
                  ) : (
                    <div className="list-cover cover-placeholder">B</div>
                  )}
                  <div>
                    <h3>{item.name_cn || item.name || '未命名作品'}</h3>
                    <p>{item.position || item.relation || '制作人员'}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="panel empty-state compact-empty">
            <h3>暂无参与作品</h3>
          </div>
        )}
      </section>
    </>
  )
}
