import { requiredPageData, requirePositiveId } from '@/lib/page-data'
import { TopicThread } from '@/components/topic-thread'

export default async function GroupTopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  requirePositiveId(id)
  const response = await requiredPageData<any>(`/groups/topic/${encodeURIComponent(id)}`)
  const topic = response
  const replies = Array.isArray(topic.replies) ? topic.replies : []
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
