import Link from 'next/link'
import { safeApiFetch } from '@/lib/api'
import { SectionHeading } from '@/components/ui'
export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const response = await safeApiFetch<any>(`/groups/${id}`); const group = response?.data
  if (!group) return <div className="panel empty-state"><h3>小组不存在或暂时不可用</h3><p>请返回小组列表重新选择。</p></div>
  const topics = Array.isArray(group.topics) ? group.topics : Array.isArray(group.topic_list) ? group.topic_list : []
  return <><div className="panel detail-hero"><div className="detail-cover cover-placeholder">组</div><div className="detail-content"><div className="eyebrow">Group</div><h1>{group.name || group.title}</h1><p className="detail-summary">{group.desc || group.description || '暂无小组简介。'}</p><div className="stats-row"><div className="stat"><strong>{group.member_count || 0}</strong><span>成员</span></div><div className="stat"><strong>{group.topic_count || topics.length}</strong><span>话题</span></div><div className="stat"><strong>{group.created_at?.slice?.(0, 10) || '—'}</strong><span>创建时间</span></div><div className="stat"><strong>公开</strong><span>访问权限</span></div></div></div></div><section><SectionHeading title="小组话题" description="在这里查看和参与讨论。" />{topics.length ? <div className="list-grid">{topics.map((topic: any) => <Link className="list-card" href={`/group/topic/${topic.id || topic.topic_id}`} key={topic.id || topic.topic_id}><div className="avatar">话</div><div><h3>{topic.title || topic.name}</h3><p>{topic.creator?.nickname || topic.creator?.username || '社区成员'} · {topic.replies || topic.reply_count || 0} 条回复</p></div></Link>)}</div> : <div className="panel empty-state"><h3>暂无话题</h3><p>来发起小组的第一个讨论吧。</p></div>}</section></>
}
