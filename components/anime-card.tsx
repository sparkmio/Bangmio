import Link from 'next/link'
import type { Subject } from '@/lib/types'
import { displayName, imageUrl } from '@/lib/api'

export function AnimeCard({ subject, compact = false }: { subject: Subject; compact?: boolean }) {
  const image = imageUrl(subject.images)
  return (
    <Link className={compact ? 'anime-card compact' : 'anime-card'} href={`/anime/${subject.id}`}>
      <div className="anime-cover">
        {image ? <img src={image} alt="" loading="lazy" /> : <div className="cover-placeholder">B</div>}
        {subject.rating?.score ? <span className="score-badge">{Number(subject.rating.score).toFixed(1)}</span> : null}
      </div>
      <div className="anime-card-body">
        <h3>{displayName(subject)}</h3>
        {subject.name && subject.name_cn && subject.name !== subject.name_cn ? <p>{subject.name}</p> : null}
        <div className="anime-meta">
          {subject.date || subject.air_date ? <span>{String(subject.date || subject.air_date).slice(0, 4)}</span> : null}
          {subject.eps || subject.eps_count ? <span>{subject.eps || subject.eps_count} 话</span> : null}
        </div>
      </div>
    </Link>
  )
}

export function AnimeGrid({ subjects, empty = '没有找到相关条目。' }: { subjects: Subject[]; empty?: string }) {
  if (!subjects.length) return <div className="empty-state"><div className="empty-icon">⌁</div><h3>{empty}</h3><p>试试调整筛选条件，或者稍后再来看看。</p></div>
  return <div className="card-grid">{subjects.map(subject => <AnimeCard key={subject.id} subject={subject} />)}</div>
}
