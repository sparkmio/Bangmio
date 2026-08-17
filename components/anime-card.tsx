import Link from 'next/link'
import type { Subject } from '@/lib/types'
import { displayName, imageUrl } from '@/lib/api'

export function AnimeCard({ subject, compact = false }: { subject: Subject; compact?: boolean }) {
  const image = imageUrl(subject.images)
  return (
    <Link className={compact ? 'anime-card compact' : 'anime-card'} href={`/anime/${subject.id}`}>
      <div className="anime-cover">
        {image ? <img src={image} alt={displayName(subject)} loading="lazy" width={200} height={280} /> : <div className="cover-placeholder">暂无封面</div>}
        <div className="anime-cover-gradient" />
        {subject.rating?.score ? <span className="score-badge">{Number(subject.rating.score).toFixed(1)}</span> : null}
        {subject.rank ? <span className="rank-badge">#{String(subject.rank)}</span> : null}
        <div className="anime-overlay-copy">
          <h3>{displayName(subject)}</h3>
          {subject.name && subject.name_cn ? <p>{subject.name}</p> : null}
        </div>
      </div>
    </Link>
  )
}

export function AnimeGrid({ subjects, empty = '没有找到相关条目。' }: { subjects: Subject[]; empty?: string }) {
  if (!subjects.length) return <div className="empty-state"><div className="empty-icon">⌁</div><h3>{empty}</h3><p>试试调整筛选条件，或者稍后再来看看。</p></div>
  return <div className="card-grid">{subjects.map(subject => <AnimeCard key={subject.id} subject={subject} />)}</div>
}
