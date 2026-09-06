import { requiredPageData, requirePositiveId } from '@/lib/page-data'
import { TopicThread } from '@/components/topic-thread'

export default async function TopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  requirePositiveId(id)
  const response = await requiredPageData<any>(`/comments/topic/${id}`)
  // comments.js returns the opening post under `op`; TopicThread consumes a
  // flattened topic shape shared with the group-topic page.
  const topic = response?.op && typeof response.op === 'object' ? response.op : response
  const replies = Array.isArray(response?.replies)
    ? response.replies
    : Array.isArray(topic?.replies)
      ? topic.replies
      : []
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
