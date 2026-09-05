import { safeApiFetch } from '@/lib/api'
import { VueGroupsClient } from '@/components/vue-groups-client'

export default async function GroupsPage() {
  const [list, discover] = await Promise.all([
    safeApiFetch<unknown>('/groups'),
    safeApiFetch<unknown>('/groups/discover')
  ])
  return (
    <VueGroupsClient
      initialGroups={list?.data || []}
      initialTopics={discover?.data || []}
      groupsFailed={!list}
      topicsFailed={!discover}
    />
  )
}
