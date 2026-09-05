import { requiredPageData, requirePositiveId } from '@/lib/page-data'
import { TopicThread } from '@/components/topic-thread'

export default async function TopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  requirePositiveId(id)
  const response = await requiredPageData<any>(`/comments/topic/${id}`)
  const topic = response
  const replies = Array.isArray(topic.replies) ? topic.replies : []
  return (
    <TopicThread
      topic={topic}
      replies={replies}
      backHref="/groups"
      backLabel="返回小组"
      composerTopicId={Number(id)}
    />
  )
}
