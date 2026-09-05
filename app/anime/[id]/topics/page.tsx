import { DataUnavailable } from '@/components/data-unavailable'
import { requirePositiveId } from '@/lib/page-data'
import Link from 'next/link'
import { safeApiFetch } from '@/lib/api'
import { DiscussionComposer } from '@/components/discussion-composer'
import { RichText } from '@/components/rich-text'

function safeText(value: unknown, fallback = ''): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value))
    return value
      .map(item => safeText(item))
      .filter(Boolean)
      .join(' / ')
  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>
    return safeText(item.name ?? item.title ?? item.nickname ?? item.content, fallback)
  }
  return fallback
}

function countValue(value: unknown) {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (Array.isArray(value)) return value.length
  if (value && typeof value === 'object') {
    const candidate = (value as any).count ?? (value as any).total ?? (value as any).length
    if (typeof candidate === 'number' || typeof candidate === 'string') return candidate
  }
  return null
}

function replyCountLabel(value: unknown) {
  const count = countValue(value)
  if (count === null || String(count).trim() === '') return '回复数暂不可用'
  return `${String(count).replaceAll(',', '')} 条回复`
}

function topicAuthor(topic: any) {
  return (
    [
      topic.creator?.nickname,
      topic.creator?.username,
      topic.user?.nickname,
      topic.user?.username,
      topic.author
    ]
      .map(value => safeText(value))
      .find(Boolean) || '社区成员'
  )
}

export default async function SubjectTopicsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  requirePositiveId(id)
  const response = await safeApiFetch<any[]>(`/comments/subject/${id}/topics`)
  const topics = Array.isArray(response?.data) ? response.data : []

  return (
    <div className="subject-discussion-page">
      <header className="subject-discussion-heading">
        <div>
          <div className="eyebrow">Discussion</div>
          <h1>条目话题</h1>
          <p>围绕这部作品的长讨论，欢迎带上你的想法。</p>
        </div>
        <Link className="button ghost" href={`/anime/${id}`}>
          返回条目
        </Link>
      </header>
      <DiscussionComposer subjectId={Number(id)} mode="topic" />
      {!response ? (
        <DataUnavailable label="讨论" />
      ) : topics.length ? (
        <section className="topic-list panel" aria-label="条目话题列表">
          {topics.map((topic: any, index: number) => (
            <Link className="topic-row" href={`/topic/${topic.id}`} key={topic.id || index}>
              <span className="topic-avatar">话</span>
              <span className="topic-row-copy">
                <strong>{safeText(topic.title ?? topic.name, '未命名话题')}</strong>
                <small>
                  {topicAuthor(topic)} · {countValue(topic.replies ?? topic.reply_count)} 条回复
                </small>
              </span>
              <span className="topic-row-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </section>
      ) : (
        <div className="panel empty-state">
          <div className="empty-icon">✦</div>
          <h3>还没有话题</h3>
          <p>成为第一个开始讨论的人。</p>
        </div>
      )}
    </div>
  )
}
