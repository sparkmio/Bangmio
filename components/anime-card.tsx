import Link from 'next/link'
import type { Subject } from '@/lib/types'
import { displayName, imageUrl } from '@/lib/api'

export function AnimeCard({ subject }: { subject: Subject }) {
  const image = imageUrl(subject.images)
  const score = Number(subject.rating?.score || 0)
  return <Link href={`/anime/${subject.id}`} className="group block animate-card-in">
    <div className="relative overflow-hidden rounded-xl bg-base-300 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-hover">
      <div className="aspect-[2/3] relative bg-base-300">
        {image ? <img src={image} alt={displayName(subject)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" width={200} height={280} loading="lazy" decoding="async" /> : <div className="w-full h-full flex items-center justify-center bg-base-200"><span className="text-xs text-base-content/30">暂无封面</span></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {score ? <div className="absolute top-2 left-2 z-10"><span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold bg-black/60 backdrop-blur-sm text-amber-400">★ {score.toFixed(1)}</span></div> : null}
        {subject.rank ? <div className="absolute top-2 right-2 z-10"><span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-black/60 backdrop-blur-sm text-white">#{String(subject.rank)}</span></div> : null}
        <div className="absolute inset-x-0 bottom-0 p-3 z-10"><h3 className="text-[13px] font-semibold text-white line-clamp-2 leading-snug">{displayName(subject)}</h3>{subject.name_cn && subject.name ? <p className="text-[11px] text-white/50 mt-0.5 line-clamp-1">{subject.name}</p> : null}</div>
      </div>
    </div>
  </Link>
}

export function AnimeGrid({ subjects, empty = '没有找到相关条目。' }: { subjects: Subject[]; empty?: string }) {
  if (!subjects.length) return <div className="text-center py-10 rounded-xl bg-base-200/30"><p className="text-sm text-base-content/40">{empty}</p></div>
  return <div className="anime-grid">{subjects.map(subject => <AnimeCard key={subject.id} subject={subject} />)}</div>
}
