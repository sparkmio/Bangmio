import type { Metadata } from 'next'
import { requiredPageData, requirePositiveId } from '@/lib/page-data'
import { TopicThread } from '@/components/topic-thread'
import { safeApiFetchServer } from '@/lib/api-server'

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const id = requirePositiveId((await params).id)
  const response = await safeApiFetchServer<{ op?: { title?: string } }>('/comments/topic/' + id)
  return { title: response?.data?.op?.title || '讨论帖' }
}

export default async function TopicPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string; subject?: string | string[]; page?: string | string[] }>
}) {
  const { id } = await params
  const query = await searchParams
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
  const subject = Array.isArray(query.subject) ? query.subject[0] : query.subject
  const backToSubject = query.from === 'subject' && !!subject && /^[1-9]\d*$/.test(subject)
  return (
    <TopicThread
      topic={topic}
      replies={replies}
      backHref={backToSubject ? `/anime/${subject}/topics` : '/groups'}
      backLabel={backToSubject ? '返回条目讨论' : '返回小组'}
      composerTopicId={Number(id)}
      page={query.page}
      pagePath={`/topic/${id}${backToSubject ? `?from=subject&subject=${subject}` : ''}`}
    />
  )
}
