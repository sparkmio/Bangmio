import { AnimeGrid } from '@/components/anime-card'
import { SectionHeading } from '@/components/ui'
import { safeApiFetch } from '@/lib/api'
import type { Subject } from '@/lib/types'

export const revalidate = 300

export default async function TrendingPage() {
  const response = await safeApiFetch<Subject[]>('/anime/browse?sort=heat&type=2&limit=30')
  const subjects = Array.isArray(response?.data) ? response.data : []
  return <><SectionHeading eyebrow="Trending" title="近期趋势" description="按社区热度整理的条目，适合寻找下一部作品。" /><AnimeGrid subjects={subjects} empty="趋势数据暂时不可用" /></>
}
