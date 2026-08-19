import Link from 'next/link'
import { safeApiFetch } from '@/lib/api'
import { DiscussionComposer } from '@/components/discussion-composer'

export default async function SubjectTopicsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const response = await safeApiFetch<any[]>(`/comments/subject/${id}/topics`)
  const topics = Array.isArray(response?.data) ? response.data : []

  return <div className="subject-discussion-page">
    <header className="subject-discussion-heading"><div><div className="eyebrow">Discussion</div><h1>条目话题</h1><p>围绕这部作品的长讨论，欢迎带上你的想法。</p></div><Link className="button ghost" href={`/anime/${id}`}>返回条目</Link></header>
    <DiscussionComposer subjectId={Number(id)} mode="topic" />
    {topics.length ? <section className="topic-list panel" aria-label="条目话题列表">{topics.map((topic: any, index: number) => <Link className="topic-row" href={`/topic/${topic.id}`} key={topic.id || index}><span className="topic-avatar">话</span><span className="topic-row-copy"><strong>{topic.title || topic.name || '未命名话题'}</strong><small>{topic.creator?.nickname || topic.creator?.username || '社区成员'} · {topic.replies || topic.reply_count || 0} 条回复</small></span><span className="topic-row-arrow" aria-hidden="true">→</span></Link>)}</section> : <div className="panel empty-state"><div className="empty-icon">✦</div><h3>还没有话题</h3><p>成为第一个开始讨论的人。</p></div>}
  </div>
}
