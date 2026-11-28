import type { Metadata } from 'next'
import { requiredPageData, requirePositiveId } from '@/lib/page-data'
import { groupTopicView } from '@/lib/community'
import { TopicThread } from '@/components/topic-thread'
import { safeApiFetchServer } from '@/lib/api-server'

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const id = requirePositiveId((await params).id)
  const response = await safeApiFetchServer<{ title?: string }>('/groups/topic/' + id)
  return { title: response?.data?.title || '小组话题' }
}

export default async function GroupTopicPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string | string[] }>
}) {
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
      page={(await searchParams).page}
      pagePath={`/group/topic/${id}`}
      composerMode="group-reply"
    />
  )
}
