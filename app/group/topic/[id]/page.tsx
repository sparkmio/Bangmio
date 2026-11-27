import type { Metadata } from 'next'
import { requiredPageData, requirePositiveId } from '@/lib/page-data'
import { groupTopicView } from '@/lib/community'
import { TopicThread } from '@/components/topic-thread'

export const metadata: Metadata = { title: '小组话题' }

export default async function GroupTopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  requirePositiveId(id)
  const response = await requiredPageData<any>(`/groups/topic/${encodeURIComponent(id)}`)
  const { topic, replies } = groupTopicView(response)
  const composerTopicId = Number(id)
  return (
    <TopicThread
      topic={topic}
      replies={replies}
      backHref={topic.group_id ? `/group/${encodeURIComponent(String(topic.group_id))}` : '/groups'}
      backLabel="返回小组"
      composerTopicId={composerTopicId}
      composerMode="group-reply"
    />
  )
}
