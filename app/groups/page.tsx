import Link from 'next/link'
import { SectionHeading } from '@/components/ui'
import { safeApiFetch } from '@/lib/api'

export const revalidate = 120
export default async function GroupsPage() {
  const [list, discover] = await Promise.all([safeApiFetch<any[]>('/groups'), safeApiFetch<any[]>('/groups/discover')])
  const groups = Array.isArray(list?.data) ? list.data : []
  const topics = Array.isArray(discover?.data) ? discover.data : []
  return <><SectionHeading eyebrow="Community" title="兴趣小组" description="找到聊作品、聊创作、聊生活的同好。" /><div className="feature-grid">{groups.slice(0, 12).map((group: any) => <Link className="panel feature" href={`/group/${group.id}`} key={group.id}><div className="feature-icon">◉</div><h3>{group.title || group.name || group.nickname || '未命名小组'}</h3><p>{group.member_count || group.members || 0} 位成员 · {group.topic_count || group.topics || 0} 个话题</p></Link>)}</div><section><SectionHeading title="正在讨论" description="社区里最近比较热的内容。" />{topics.length ? <div className="list-grid">{topics.slice(0, 12).map((topic: any) => <Link className="list-card" href={`/group/topic/${topic.id || topic.topic_id}`} key={topic.id || topic.topic_id}><div className="avatar">话</div><div><h3>{topic.title || topic.name || '未命名话题'}</h3><p>{topic.group?.name || topic.group_name || '小组话题'}</p></div></Link>)}</div> : <div className="panel empty-state"><h3>还没有公开话题</h3><p>成为第一个发起讨论的人。</p></div>}</section></>
}
