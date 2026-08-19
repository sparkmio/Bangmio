import Link from 'next/link'
import { safeApiFetch } from '@/lib/api'
import { SectionHeading } from '@/components/ui'

function groupTitle(group: any) {
  return group.name || group.title || '未命名小组'
}

function topicHref(topic: any) {
  return `/group/topic/${topic.id || topic.topic_id}`
}

function countValue(value: unknown, fallback = 0) {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (Array.isArray(value)) return value.length
  if (value && typeof value === 'object') {
    const candidate = (value as any).count ?? (value as any).total ?? (value as any).length
    if (typeof candidate === 'number' || typeof candidate === 'string') return candidate
  }
  return fallback
}
export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const response = await safeApiFetch<any>(`/groups/${id}`)
  const group = response?.data
  if (!group) return <div className="panel empty-state"><h3>小组不存在或暂时不可用</h3><p>请返回小组列表重新选择。</p></div>

  const topics = Array.isArray(group.topics) ? group.topics : Array.isArray(group.topic_list) ? group.topic_list : []
  const title = groupTitle(group)
  const description = group.desc || group.description || group.summary || '这是一个等待大家一起补充内容的兴趣小组。'

  return <div className="group-detail-page">
    <header className="panel group-detail-hero">
      <div className="group-detail-mark" aria-hidden="true">{title.slice(0, 1)}</div>
      <div className="group-detail-copy">
        <div className="eyebrow">Community group</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="group-detail-stats" aria-label="小组数据">
        <span><b>{countValue(group.member_count ?? group.members)}</b><small>成员</small></span>
        <span><b>{countValue(group.topic_count, topics.length)}</b><small>话题</small></span>
        <span><b>{typeof group.created_at === 'string' ? group.created_at.slice(0, 10) : '公开'}</b><small>{typeof group.created_at === 'string' ? '创建于' : '访问权限'}</small></span>
      </div>
    </header>

    <section className="group-topic-section">
      <SectionHeading eyebrow="Discussions" title="小组话题" description="浏览正在进行的讨论，和同好一起接着聊。" href="/groups" action="返回小组" />
      {topics.length ? <div className="topic-list panel">
        {topics.map((topic: any, index: number) => <Link className="topic-row" href={topicHref(topic)} key={topic.id || topic.topic_id || index}>
          <span className="topic-avatar">话</span>
          <span className="topic-row-copy"><strong>{topic.title || topic.name || '未命名话题'}</strong><small>{topic.creator?.nickname || topic.creator?.username || '社区成员'} · {countValue(topic.replies ?? topic.reply_count)} 条回复</small></span>
          <span className="topic-row-arrow" aria-hidden="true">→</span>
        </Link>)}
      </div> : <div className="panel empty-state"><div className="empty-icon">✦</div><h3>暂无话题</h3><p>来发起小组的第一个讨论吧。</p></div>}
    </section>
  </div>
}
