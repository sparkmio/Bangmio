import { HomeClient } from '@/components/home-client'
import { safeApiFetch } from '@/lib/api'
import type { Subject } from '@/lib/types'

export const revalidate = 300

export default async function HomePage() {
  const hot = await safeApiFetch<Subject[]>('/anime/browse?sort=heat&type=2&limit=12')
  return <HomeClient initialHot={Array.isArray(hot?.data) ? hot.data : []} />
}
