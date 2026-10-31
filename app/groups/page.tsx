import type { Metadata } from 'next'
import { safeApiFetchServer } from '@/lib/api-server'
import { GroupsClient } from '@/components/groups-client'

export const metadata: Metadata = { title: '小组与讨论' }

export default async function GroupsPage() {
  const [list, discover] = await Promise.all([
    safeApiFetchServer<unknown>('/groups'),
    safeApiFetchServer<unknown>('/groups/discover')
  ])
  return (
    <GroupsClient
      initialGroups={list?.data || []}
      initialTopics={discover?.data || []}
      groupsFailed={!list}
      topicsFailed={!discover}
      groupsDegraded={list?.degraded === true}
      topicsDegraded={discover?.degraded === true}
    />
  )
}
