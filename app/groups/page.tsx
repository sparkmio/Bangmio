import { safeApiFetch } from '@/lib/api'
import { VueGroupsClient } from '@/components/vue-groups-client'
export const revalidate = 120
export default async function GroupsPage() { const [list, discover] = await Promise.all([safeApiFetch<any[]>('/groups'), safeApiFetch<any[]>('/groups/discover')]); return <VueGroupsClient initialGroups={Array.isArray(list?.data) ? list.data : []} initialTopics={Array.isArray(discover?.data) ? discover.data : []} /> }