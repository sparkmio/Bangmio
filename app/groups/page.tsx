import { safeApiFetch } from '@/lib/api'
import { GroupsClient } from '@/components/groups-client'

export default async function GroupsPage() {
  const [list, discover] = await Promise.all([
    safeApiFetch<unknown>('/groups'),
    safeApiFetch<unknown>('/groups/discover')
  ])
  return (
    <GroupsClient
      initialGroups={list?.data || []}
      initialTopics={discover?.data || []}
      groupsFailed={!list}
      topicsFailed={!discover}
    />
  )
}
