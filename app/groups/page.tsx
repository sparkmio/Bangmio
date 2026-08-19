import Link from 'next/link'
import { safeApiFetch } from '@/lib/api'

export const revalidate = 120

function groupTitle(group: any) { return group.title || group.name || group.nickname || '未命名小组' }

function countValue(value: unknown, fallback = 0) {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (Array.isArray(value)) return value.length
  if (value && typeof value === 'object') {
    const candidate = (value as any).count ?? (value as any).total ?? (value as any).length
    if (typeof candidate === 'number' || typeof candidate === 'string') return candidate
  }
  return fallback
}

export default async function GroupsPage() {
  const [list, discover] = await Promise.all([safeApiFetch<any[]>('/groups'), safeApiFetch<any[]>('/groups/discover')])
  const groups = Array.isArray(list?.data) ? list.data : []
  const topics = Array.isArray(discover?.data) ? discover.data : []
  return <div className="community-page">
    <section className="community-hero"><div><p className="eyebrow">COMMUNITY</p><h1>在喜欢的作品里，遇见同好</h1><p>加入兴趣小组，分享你的观后感、发现和正在追的故事。</p></div><Link className="primary-button" href="/anime">发现作品 <span>→</span></Link></section>
    <section className="community-section"><div className="section-heading"><div><p className="eyebrow">GROUPS</p><h2>兴趣小组</h2><p>从作品、创作和日常话题开始聊天。</p></div></div>{groups.length ? <div className="group-grid">{groups.slice(0, 12).map((group: any, index) => <Link className="group-card" href={`/group/${group.id}`} key={group.id}><span className={`group-mark mark-${index % 4}`}>{String(groupTitle(group)).slice(0, 1)}</span><div><h3>{groupTitle(group)}</h3><p>{group.description || group.summary || '和感兴趣的人聊聊作品与生活。'}</p><small>{countValue(group.member_count ?? group.members)} 位成员 · {countValue(group.topic_count ?? group.topics)} 个话题</small></div><span className="group-arrow">→</span></Link>)}</div> : <div className="page-panel empty-state"><div className="empty-icon">◎</div><h3>小组正在准备中</h3><p>稍后再来看看新开放的兴趣小组吧。</p></div>}</section>
    <section className="community-section"><div className="section-heading"><div><p className="eyebrow">RECENT DISCUSSIONS</p><h2>正在讨论</h2><p>社区里最近比较热的内容。</p></div></div>{topics.length ? <div className="topic-list page-panel">{topics.slice(0, 12).map((topic: any) => <Link className="topic-row" href={`/group/topic/${topic.id || topic.topic_id}`} key={topic.id || topic.topic_id}><span className="topic-avatar">话</span><span className="topic-row-copy"><strong>{topic.title || topic.name || '未命名话题'}</strong><small>{topic.group?.name || topic.group_name || '小组话题'} · {countValue(topic.replies ?? topic.reply_count)} 条回复</small></span><span className="topic-row-arrow">→</span></Link>)}</div> : <div className="page-panel empty-state"><div className="empty-icon">✦</div><h3>还没有公开话题</h3><p>成为第一个发起讨论的人。</p></div>}</section>
  </div>
}
