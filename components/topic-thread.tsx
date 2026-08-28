import Link from 'next/link'
import { DiscussionComposer } from './discussion-composer'
import { RichText } from './rich-text'
import { communityProfile } from '@/lib/community'

type TopicThreadProps = {
  topic: any
  replies: any[]
  backHref: string
  backLabel: string
  composerTopicId?: number
  composerMode?: 'reply' | 'group-reply'
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

function dateLabel(value: unknown) {
  return typeof value === 'string' && value ? value : '时间未知'
}

export function TopicThread({ topic, replies, backHref, backLabel, composerTopicId, composerMode }: TopicThreadProps) {
  const authorProfile = communityProfile(topic)
  return <div className="discussion-page">
    <article className="panel discussion-header">
      <div className="eyebrow">TOPIC</div>
      <h1>{safeText(topic.title, '未命名话题')}</h1>
      <div className="discussion-author"><div className="avatar">{authorProfile.avatar ? <img src={authorProfile.avatar} alt="" loading="lazy" /> : authorProfile.name.slice(0, 1)}</div><span>{authorProfile.name}</span><time>{dateLabel(topic.created_at || topic.timestamp)}</time></div>
      <RichText value={topic.content ?? topic.body} fallback="暂无正文。" />
    </article>

    <section className="discussion-replies" aria-labelledby="reply-heading">
      <h2 id="reply-heading">回复 {replies.length ? `(${replies.length})` : ''}</h2>
      {replies.length ? replies.map((reply: any, index) => {
        const profile = communityProfile(reply)
        const name = profile.name
        return <article className="panel reply-card" key={reply.id || index}>
          <div className="avatar">{profile.avatar ? <img src={profile.avatar} alt="" loading="lazy" /> : name.slice(0, 1)}</div>
          <div>
            <h3>{name}</h3>
            <RichText value={reply.content ?? reply.body} fallback="暂无回复内容。" />
          </div>
        </article>
      }) : <div className="panel empty-state"><h3>还没有回复</h3><p>成为第一个参与讨论的人吧。</p></div>}
    </section>

    {composerTopicId ? <DiscussionComposer topicId={composerTopicId} mode={composerMode || "reply"} /> : null}
    <Link className="text-link discussion-back" href={backHref}>← {backLabel}</Link>
  </div>
}
