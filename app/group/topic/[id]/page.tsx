import { safeApiFetch } from '@/lib/api'
import { TopicThread } from '@/components/topic-thread'

export default async function GroupTopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const response = await safeApiFetch<any>(`/groups/topic/${id}`)
  const topic = response?.data
  if (!topic) return <div className="panel empty-state"><h3>话题暂时不可用</h3><p>请稍后再试。</p></div>
  const replies = Array.isArray(topic.replies) ? topic.replies : []
  return <TopicThread topic={topic} replies={replies} backHref="/groups" backLabel="返回小组" />
}