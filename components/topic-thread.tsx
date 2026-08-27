import Link from 'next/link'
import { DiscussionComposer } from './discussion-composer'

type TopicThreadProps = {
  topic: any
  replies: any[]
  backHref: string
  backLabel: string
  composerTopicId?: number
}

function safeText(value: unknown, fallback = ''): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(item => safeText(item)).filter(Boolean).join(' / ')
  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>
    return safeText(item.nickname ?? item.username ?? item.name ?? item.title ?? item.content ?? item.body, fallback)
  }
  return fallback
}

function creatorName(value: any) {
  return safeText(value?.nickname ?? value?.username, '社区成员')
}

function dateLabel(value: unknown) {
  return typeof value === 'string' && value ? value : '时间未知'
}

export function TopicThread({ topic, replies, backHref, backLabel, composerTopicId }: TopicThreadProps) {
  const author = creatorName(topic.creator)
  return <div className="discussion-page">
    <article className="panel discussion-header">
      <div className="eyebrow">TOPIC</div>
      <h1>{safeText(topic.title, '未命名话题')}</h1>
      <p className="discussion-body">{safeText(topic.content ?? topic.body, '暂无正文。')}</p>
      <p className="discussion-meta">{author} · {dateLabel(topic.created_at)}</p>
    </article>

    <section className="discussion-replies" aria-labelledby="reply-heading">
      <h2 id="reply-heading">回复 {replies.length ? `(${replies.length})` : ''}</h2>
      {replies.length ? replies.map((reply: any, index) => {
        const name = creatorName(reply.creator)
        return <article className="panel reply-card" key={reply.id || index}>
          <div className="avatar">{name.slice(0, 1)}</div>
          <div>
            <h3>{name}</h3>
            <p>{safeText(reply.content ?? reply.body, '暂无回复内容。')}</p>
          </div>
        </article>
      }) : <div className="panel empty-state"><h3>还没有回复</h3><p>成为第一个参与讨论的人吧。</p></div>}
    </section>

    {composerTopicId ? <DiscussionComposer topicId={composerTopicId} mode="reply" /> : null}
    <Link className="text-link discussion-back" href={backHref}>← {backLabel}</Link>
  </div>
}
