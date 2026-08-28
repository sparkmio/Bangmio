import { safeApiFetch } from '@/lib/api'
import { TopicThread } from '@/components/topic-thread'

export default async function GroupTopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^\d+$/.test(id) || Number(id) <= 0 || !Number.isSafeInteger(Number(id))) return <div className="panel empty-state"><h3>话题地址不合法</h3><p>请返回小组重新选择。</p></div>
  const response = await safeApiFetch<any>(`/groups/topic/${encodeURIComponent(id)}`)
  const topic = response?.data
  if (!topic) return <div className="panel empty-state"><h3>话题暂时不可用</h3><p>请稍后再试。</p></div>
  const replies = Array.isArray(topic.replies) ? topic.replies : []
  const composerTopicId = Number(id)
  return <TopicThread topic={topic} replies={replies} backHref={topic.group_id ? `/group/${encodeURIComponent(String(topic.group_id))}` : '/groups'} backLabel="返回小组" composerTopicId={composerTopicId} composerMode="group-reply" />
}
