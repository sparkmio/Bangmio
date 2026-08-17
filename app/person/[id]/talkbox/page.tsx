import Link from 'next/link'
import { safeApiFetch } from '@/lib/api'
import { DiscussionComposer } from '@/components/discussion-composer'

export default async function PersonTalkboxPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const response = await safeApiFetch<any[]>(`/comments/person/${id}`)
  const comments = Array.isArray(response?.data) ? response.data : []

  return <>
    <div className="section-heading">
      <div><div className="eyebrow">Person Talkbox</div><h1>人物吐槽箱</h1><p>围绕这位人物留下短评。</p></div>
      <Link className="button ghost" href={`/person/${id}`}>返回人物</Link>
    </div>
    <DiscussionComposer subjectId={Number(id)} mode="person-talkbox" />
    {comments.length ? <div className="list-grid">{comments.map((comment: any, index: number) => {
      const user = comment.user || comment.creator || {}
      const content = comment.content || comment.comment || ''
      return <div className="list-card" key={comment.id || index}><div className="avatar">{(user.nickname || user.username || '友').slice(0, 1)}</div><div><h3>{user.nickname || user.username || '社区成员'}</h3><p>{content}</p>{comment.timestamp ? <small className="muted-copy">{comment.timestamp}</small> : null}</div></div>
    })}</div> : <div className="panel empty-state"><h3>还没有吐槽</h3><p>留下关于这位人物的第一句话。</p></div>}
  </>
}
