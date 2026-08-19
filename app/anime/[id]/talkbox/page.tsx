import Link from 'next/link'
import { safeApiFetch } from '@/lib/api'
import { DiscussionComposer } from '@/components/discussion-composer'

function authorName(comment: any) {
  return comment.user?.nickname || comment.user?.username || comment.creator?.nickname || comment.creator?.username || '社区成员'
}

export default async function SubjectTalkboxPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const response = await safeApiFetch<any[]>(`/comments/subject/${id}`)
  const comments = Array.isArray(response?.data) ? response.data : []

  return <div className="subject-discussion-page">
    <header className="subject-discussion-heading"><div><div className="eyebrow">Talkbox</div><h1>吐槽箱</h1><p>短一点，轻松聊，留下你此刻的感受。</p></div><Link className="button ghost" href={`/anime/${id}`}>返回条目</Link></header>
    <DiscussionComposer subjectId={Number(id)} mode="talkbox" />
    {comments.length ? <section className="comment-thread" aria-label="吐槽列表">{comments.map((comment: any, index: number) => {
      const author = authorName(comment)
      return <article className="panel comment-card" key={comment.id || index}><span className="avatar">{author.slice(0, 1)}</span><div><div className="comment-card-head"><strong>{author}</strong><small>{comment.created_at || comment.date || `第 ${index + 1} 条吐槽`}</small></div><p>{comment.content || comment.comment || '暂无内容。'}</p></div></article>
    })}</section> : <div className="panel empty-state"><div className="empty-icon">✦</div><h3>还没有吐槽</h3><p>看完之后，留下你的第一句话。</p></div>}
  </div>
}
