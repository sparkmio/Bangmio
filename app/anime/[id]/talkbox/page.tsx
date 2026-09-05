import { DataUnavailable } from '@/components/data-unavailable'
import { requirePositiveId } from '@/lib/page-data'
import Link from 'next/link'
import { safeApiFetch } from '@/lib/api'
import { DiscussionComposer } from '@/components/discussion-composer'
import { RichText } from '@/components/rich-text'
import { communityProfile } from '@/lib/community'

function commentDate(comment: any, index: number) {
  const value = comment.created_at || comment.date
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return `第 ${index + 1} 条吐槽`
}

export default async function SubjectTalkboxPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  requirePositiveId(id)
  const response = await safeApiFetch<any[]>(`/comments/subject/${id}`)
  const comments = Array.isArray(response?.data) ? response.data : []

  return (
    <div className="subject-discussion-page">
      <header className="subject-discussion-heading">
        <div>
          <div className="eyebrow">Talkbox</div>
          <h1>吐槽箱</h1>
          <p>短一点，轻松聊，留下你此刻的感受。</p>
        </div>
        <Link className="button ghost" href={`/anime/${id}`}>
          返回条目
        </Link>
      </header>
      <DiscussionComposer subjectId={Number(id)} mode="talkbox" />
      {!response ? (
        <DataUnavailable label="吐槽" />
      ) : comments.length ? (
        <section className="comment-thread" aria-label="吐槽列表">
          {comments.map((comment: any, index: number) => {
            const profile = communityProfile(comment)
            return (
              <article className="panel comment-card" key={comment.id || index}>
                <span className="avatar">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt="" loading="lazy" />
                  ) : (
                    profile.name.slice(0, 1)
                  )}
                </span>
                <div>
                  <div className="comment-card-head">
                    <strong>{profile.name}</strong>
                    <small>{commentDate(comment, index)}</small>
                  </div>
                  <RichText value={comment.content || comment.comment} fallback="暂无内容。" />
                </div>
              </article>
            )
          })}
        </section>
      ) : (
        <div className="panel empty-state">
          <div className="empty-icon">✦</div>
          <h3>还没有吐槽</h3>
          <p>看完之后，留下你的第一句话。</p>
        </div>
      )}
    </div>
  )
}
