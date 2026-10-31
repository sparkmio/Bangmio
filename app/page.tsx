import { HomeClient } from '@/components/home-client'
import { safeApiFetchServer } from '@/lib/api-server'
import type { Subject } from '@/lib/types'

export const revalidate = 300

export default async function HomePage() {
  const hot = await safeApiFetchServer<Subject[]>('/anime/browse?sort=heat&type=2&limit=12')
  return <HomeClient initialHot={Array.isArray(hot?.data) ? hot.data : []} />
}
