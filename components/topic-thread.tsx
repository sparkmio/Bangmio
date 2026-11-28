import { BangumiImage } from '@/components/bangumi-image'
import Link from 'next/link'
import { DiscussionComposer } from './discussion-composer'
import { RichText } from './rich-text'
import { communityProfile } from '@/lib/community'
import { ReplyAction } from './reply-action'

type TopicThreadProps = {
  topic: any
  replies: any[]
  backHref: string
  backLabel: string
  composerTopicId?: number
  composerMode?: 'reply' | 'group-reply'
  page?: string | string[]
  pagePath?: string
}

function safeText(value: unknown, fallback = ''): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value))
    return value
      .map(item => safeText(item))
      .filter(Boolean)
      .join(' / ')
  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>
    return safeText(
      item.nickname ?? item.username ?? item.name ?? item.title ?? item.content ?? item.body,
      fallback
    )
  }
  return fallback
}

function dateLabel(value: unknown) {
  if (typeof value === 'string' && value.trim()) return value
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value < 10_000_000_000 ? value * 1000 : value)
    if (!Number.isNaN(date.getTime())) return date.toLocaleString('zh-CN', { hour12: false })
  }
  return '时间未知'
}

function replyCount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value
  if (typeof value === 'string' && /^\s*\d[\d,]*\s*$/.test(value)) {
    const parsed = Number(value.replaceAll(',', '').trim())
    return Number.isSafeInteger(parsed) ? parsed : null
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return replyCount(record.count ?? record.total ?? record.length)
  }
  return null
}

export function TopicThread({
  topic,
  replies,
  backHref,
  backLabel,
  composerTopicId,
  composerMode,
  page,
  pagePath
}: TopicThreadProps) {
  const authorProfile = communityProfile(topic)
  const allReplies = replies.flatMap(reply => [
    reply,
    ...(Array.isArray(reply.replies) ? reply.replies : [])
  ])
  const loaded = allReplies.length
  const pageSize = 30
  const pageCount = Math.max(1, Math.ceil(loaded / pageSize))
  const requestedPage = Number(Array.isArray(page) ? page[0] : page)
  const currentPage =
    pagePath && Number.isSafeInteger(requestedPage)
      ? Math.max(1, Math.min(pageCount, requestedPage))
      : 1
  const offset = (currentPage - 1) * pageSize
  const visible = pagePath ? allReplies.slice(offset, offset + pageSize) : allReplies
  const hrefFor = (target: number) => {
    const url = new URL(pagePath || backHref, 'https://bangmio.site')
    url.searchParams.set('page', String(target))
    return url.pathname + url.search + '#reply-heading'
  }
  const totalReplies = replyCount(topic.reply_count ?? topic.replyCount)
  const replySummary =
    totalReplies === null
      ? loaded
        ? `已加载 ${loaded} 条`
        : ''
      : totalReplies === loaded
        ? `共 ${totalReplies} 条`
        : `共 ${totalReplies} 条，已加载 ${loaded} 条`
  return (
    <div className="discussion-page">
      <Link className="text-link" href={backHref}>
        ← {backLabel}
      </Link>
      <article className="panel discussion-header">
        <div className="eyebrow">TOPIC</div>
        <h1>{safeText(topic.title, '未命名话题')}</h1>
        <div className="discussion-header-actions">
          {composerTopicId ? (
            <a className="button primary" href="#reply-composer">
              回复这条话题
            </a>
          ) : null}
          {composerTopicId ? <ReplyAction author={authorProfile.name} floor="主楼" /> : null}
        </div>
        <div className="discussion-context">
          {topic.group_name ? <span>{safeText(topic.group_name)}</span> : null}
          {topic.group_id ? <span>#{safeText(topic.group_id)}</span> : null}
        </div>
        <div className="discussion-author">
          <div className="avatar">
            {authorProfile.avatar ? (
              <BangumiImage src={authorProfile.avatar} alt="" loading="lazy" />
            ) : (
              authorProfile.name.slice(0, 1)
            )}
          </div>
          <span>{authorProfile.name}</span>
          <time>{dateLabel(topic.created_at || topic.timestamp)}</time>
        </div>
        <RichText value={topic.content ?? topic.body} fallback="暂无正文。" />
      </article>

      <section className="discussion-replies" aria-labelledby="reply-heading">
        <h2 id="reply-heading">回复{replySummary ? `（${replySummary}）` : ''}</h2>
        {visible.length ? (
          visible.map((reply: any, index) => {
            const profile = communityProfile(reply)
            const name = profile.name
            return (
              <article
                id={`reply-${reply.id || index + 1}`}
                className="panel reply-card"
                key={reply.id || index}
              >
                <div className="avatar">
                  {profile.avatar ? (
                    <BangumiImage src={profile.avatar} alt="" loading="lazy" />
                  ) : (
                    name.slice(0, 1)
                  )}
                </div>
                <div>
                  <div className="reply-meta">
                    <h3>{name}</h3>
                    <span className="reply-meta-side">
                      <small>#{safeText(reply.floor, String(offset + index + 1))}</small>
                      {dateLabel(reply.timestamp || reply.created_at) !== '时间未知' ? (
                        <time>{dateLabel(reply.timestamp || reply.created_at)}</time>
                      ) : null}
                      <ReplyAction
                        author={name}
                        floor={safeText(reply.floor, String(offset + index + 1))}
                      />
                    </span>
                  </div>
                  <RichText value={reply.content ?? reply.body} fallback="暂无回复内容。" />
                </div>
              </article>
            )
          })
        ) : (
          <div className="panel empty-state">
            <h3>还没有回复</h3>
            <p>成为第一个参与讨论的人吧。</p>
          </div>
        )}
        {pagePath && pageCount > 1 ? (
          <nav aria-label="回复分页" className="discussion-header-actions">
            {currentPage > 1 ? (
              <Link className="button" href={hrefFor(currentPage - 1)}>
                上一页
              </Link>
            ) : null}
            <span>
              第 {currentPage} / {pageCount} 页
            </span>
            {currentPage < pageCount ? (
              <Link className="button" href={hrefFor(currentPage + 1)}>
                下一页
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>

      {composerTopicId ? (
        <DiscussionComposer topicId={composerTopicId} mode={composerMode || 'reply'} />
      ) : null}
      <Link className="text-link discussion-back" href={backHref}>
        ← {backLabel}
      </Link>
    </div>
  )
}
