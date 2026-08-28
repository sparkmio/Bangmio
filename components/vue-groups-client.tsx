'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from './auth-provider'

type Group = { id: number | string; name?: string; title?: string; avatar?: string; icon?: string; description?: string; summary?: string; member_count?: number | string | null; topic_count?: number | string | null; members?: unknown; topics?: unknown }
type Topic = { id?: number | string; topic_id?: number | string; title?: string; group_name?: string; author?: string; last_reply_time?: string; reply_count?: number | string | null; replies?: unknown; group?: { name?: string } }

function text(value: unknown, fallback = ''): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(item => text(item)).filter(Boolean).join(' / ')
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return text(record.name ?? record.title ?? record.label ?? record.text ?? record.value, fallback)
  }
  return fallback
}
function groupTitle(group: Group) { return text(group.name ?? group.title, '未命名小组') }
function count(value: unknown): number | null {
  if (Array.isArray(value)) return value.length
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^\s*\d[\d,]*\s*$/.test(value)) return Number(value.replace(/,/g, ''))
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return count(record.count ?? record.total ?? record.length)
  }
  return null
}
function memberLabel(value: unknown) { const number = count(value); return number !== null ? `${number.toLocaleString()} 成员` : '成员数暂不可用' }
function replyLabel(value: unknown) { const number = count(value); return number !== null ? `${number} 回复` : '回复数暂不可用' }
function normalizeGroup(value: unknown, index = 0): Group | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  const id = item.id ?? item.group_id ?? item.slug ?? index
  return { ...item, id: typeof id === 'string' || typeof id === 'number' ? id : index, name: text(item.name ?? item.title, '未命名小组'), avatar: text(item.avatar ?? item.icon), description: text(item.description ?? item.desc ?? item.summary) } as Group
}
function normalizeTopic(value: unknown, index = 0): Topic | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  const id = item.id ?? item.topic_id ?? index
  return { ...item, id: typeof id === 'string' || typeof id === 'number' ? id : index, title: text(item.title ?? item.name, '未命名话题'), group_name: text(item.group_name ?? (item.group as Record<string, unknown> | undefined)?.name, '小组'), author: text(item.author ?? (item.creator as Record<string, unknown> | undefined)?.nickname), last_reply_time: text(item.last_reply_time ?? item.updated_at), reply_count: count(item.reply_count ?? item.replies) } as Topic
}
function arrayFrom(value: unknown, key?: string) {
  const source = Array.isArray(value) ? value : key && value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : []
  return Array.isArray(source) ? source : []
}

function GroupCard({ group, followed = false }: { group: Group; followed?: boolean }) {
  const title = groupTitle(group)
  const image = text(group.avatar || group.icon)
  return <Link href={`/group/${encodeURIComponent(String(group.id))}`} className={`group-card card bg-base-100 border ${followed ? 'border-primary/20 hover:border-primary/50' : 'border-base-300'} hover:shadow-hover transition-all`}>
    <div className="card-body p-4"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-full overflow-hidden bg-base-200 shrink-0">{image && /^https?:\/\//i.test(image) ? <img src={image} alt={title} className="w-full h-full object-cover" loading="lazy" decoding="async" /> : <div className="w-full h-full flex items-center justify-center text-base-content/40">{title.slice(0, 1)}</div>}</div><div className="min-w-0"><p className="font-semibold truncate">{title}</p><p className="text-xs text-base-content/50 mt-1 line-clamp-2">{memberLabel(group.member_count ?? group.members)} · {text(group.description || group.summary, '暂无简介')}</p></div></div></div>
  </Link>
}
function TopicList({ topics }: { topics: Topic[] }) { return <div className="divide-y divide-base-300">{topics.map((topic, index) => <Link href={`/group/topic/${encodeURIComponent(String(topic.id || topic.topic_id || index))}`} className="p-4 flex items-start gap-3 hover:bg-base-200/60 transition-colors" key={topic.id || topic.topic_id || index}><div className="min-w-0 flex-1"><p className="font-medium line-clamp-2">{text(topic.title, '未命名话题')}</p><div className="mt-1 flex items-center gap-x-2 gap-y-1 flex-wrap text-xs text-base-content/50"><span>{text(topic.group_name || topic.group?.name, '小组')}</span>{text(topic.author) ? <span>{text(topic.author)}</span> : null}{text(topic.last_reply_time) ? <span>{text(topic.last_reply_time)}</span> : null}</div></div><span className="badge badge-sm badge-primary badge-outline whitespace-nowrap">{replyLabel(topic.reply_count ?? topic.replies)}</span></Link>)}</div> }

export function VueGroupsClient({ initialGroups, initialTopics }: { initialGroups: unknown; initialTopics: unknown }) {
  const { user, request } = useAuth()
  const initialGroupList = useMemo(() => arrayFrom(initialGroups).map(normalizeGroup).filter(Boolean) as Group[], [initialGroups])
  const initialTopicList = useMemo(() => arrayFrom(initialTopics).map(normalizeTopic).filter(Boolean) as Topic[], [initialTopics])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Group[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [followedGroups, setFollowedGroups] = useState<Group[]>([])
  const [followedLoading, setFollowedLoading] = useState(false)
  const [allGroups, setAllGroups] = useState<Group[]>(initialGroupList)
  const [allGroupsLoading, setAllGroupsLoading] = useState(false)
  const [allGroupsError, setAllGroupsError] = useState('')
  const [hotTopics, setHotTopics] = useState<Topic[]>(initialTopicList)
  const [topicsLoading, setTopicsLoading] = useState(false)
  const [topicsError, setTopicsError] = useState('')
  const currentUsername = text(user?.username)
  const isSearching = Boolean(searchQuery.trim())

  const loadFollowedGroups = useCallback(async () => {
    if (!currentUsername) { setFollowedGroups([]); return }
    setFollowedLoading(true)
    try {
      const payload = await request<unknown>(`/user/${encodeURIComponent(currentUsername)}/groups`, {}, { authenticate: false })
      const groups = arrayFrom(payload?.data).map(normalizeGroup).filter(Boolean) as Group[]
      const enriched = await Promise.all(groups.map(async group => { try { const detail = await request<unknown>(`/groups/${encodeURIComponent(String(group.id))}`, {}, { authenticate: false }); const value = detail?.data && typeof detail.data === 'object' ? detail.data as Record<string, unknown> : {}; const memberCount = count(value.member_count); return { ...group, member_count: memberCount !== null ? memberCount : group.member_count, topic_count: count(value.topic_count ?? value.topics_count), avatar: text(value.avatar) || group.avatar, topics: arrayFrom(value.topics) } } catch { return group } }))
      setFollowedGroups(enriched)
    } catch { setFollowedGroups([]) } finally { setFollowedLoading(false) }
  }, [currentUsername, request])

  const searchGroups = useCallback(async () => { const keyword = searchQuery.trim(); if (!keyword) { setSearchResults([]); setSearchError(''); return }; setSearchLoading(true); setSearchError(''); try { const response = await fetch(`/api/v1/groups/search?keyword=${encodeURIComponent(keyword)}`, { headers: { Accept: 'application/json' } }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error('搜索失败'); setSearchResults(arrayFrom(payload?.data, 'results').map(normalizeGroup).filter(Boolean) as Group[]) } catch (error) { setSearchResults([]); setSearchError(error instanceof Error ? error.message : '搜索失败') } finally { setSearchLoading(false) } }, [searchQuery])
  const loadAllGroups = useCallback(async () => { setAllGroupsLoading(true); setAllGroupsError(''); try { const response = await fetch('/api/v1/groups', { headers: { Accept: 'application/json' } }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error('小组列表加载失败'); const groups = arrayFrom(payload?.data, 'groups').map(normalizeGroup).filter(Boolean) as Group[]; setAllGroups(groups); if (!groups.length) setAllGroupsError('暂时没有可显示的小组') } catch (error) { setAllGroupsError(error instanceof Error ? error.message : '小组列表加载失败') } finally { setAllGroupsLoading(false) } }, [])
  const loadHotTopics = useCallback(async () => { setTopicsLoading(true); setTopicsError(''); try { const response = await fetch('/api/v1/groups/discover', { headers: { Accept: 'application/json' } }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error('热门话题加载失败'); const topics = arrayFrom(payload?.data, 'topics').map(normalizeTopic).filter(Boolean) as Topic[]; setHotTopics(topics); if (!topics.length) setTopicsError('暂时没有热门话题') } catch (error) { setTopicsError(error instanceof Error ? error.message : '热门话题加载失败') } finally { setTopicsLoading(false) } }, [])
  useEffect(() => { void loadFollowedGroups() }, [loadFollowedGroups])
  useEffect(() => { if (!searchQuery.trim()) { setSearchResults([]); setSearchError(''); return }; const timer = window.setTimeout(() => void searchGroups(), 300); return () => window.clearTimeout(timer) }, [searchQuery, searchGroups])

  return <div className="container mx-auto px-4 py-6 max-w-5xl"><div className="flex items-center justify-between mb-8 gap-3 flex-wrap"><div><h1 className="text-2xl font-bold">小组</h1><p className="text-sm text-base-content/50 mt-1">先看你关注的小组，再看看全站正在讨论什么。</p></div><div className="flex items-center gap-2"><input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void searchGroups() }} type="search" placeholder="搜索小组" className="input input-bordered input-sm w-48" /><button className="btn btn-sm btn-primary" disabled={searchLoading} type="button" onClick={() => void searchGroups()}>{searchLoading ? '搜索中' : '搜索'}</button></div></div>
    {isSearching ? <section aria-labelledby="group-search-heading"><div className="flex items-center justify-between mb-4"><h2 id="group-search-heading" className="text-lg font-bold">搜索结果</h2><button className="btn btn-xs btn-ghost" type="button" onClick={() => setSearchQuery('')}>返回小组首页</button></div>{searchLoading ? <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-24 rounded-xl skeleton" />)}</div> : searchResults.length ? <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{searchResults.map(group => <GroupCard group={group} key={group.id} />)}</div> : <div className="panel empty-state"><h3>{searchError || '未找到匹配的小组'}</h3><p>换个关键词再试试。</p></div>}</section> : <><section className="mb-8"><div className="flex items-center justify-between gap-3 mb-4"><div><h2 className="text-lg font-bold">我关注的小组</h2>{currentUsername ? <p className="text-xs text-base-content/50 mt-1">{currentUsername} 参加的小组</p> : null}</div><button className="btn btn-xs btn-ghost" disabled={followedLoading} type="button" onClick={() => void loadFollowedGroups()}>刷新</button></div>{followedLoading ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-24 rounded-xl skeleton" />)}</div> : followedGroups.length ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{followedGroups.map(group => <GroupCard followed group={group} key={group.id} />)}</div> : <div className="panel empty-state compact-empty"><h3>还没有关注的小组</h3><p>登录并绑定 Bangumi 后，这里会显示你参加的小组。</p></div>}</section><section className="mb-10"><div className="flex items-end justify-between gap-3 mb-4"><div><h2 className="text-lg font-bold">所有小组的热门帖子</h2><p className="text-xs text-base-content/50 mt-1">来自 Bangumi 小组发现页。</p></div><button className="btn btn-xs btn-ghost" disabled={topicsLoading} type="button" onClick={() => void loadHotTopics()}>刷新</button></div><div className="card bg-base-100 border border-base-300 overflow-hidden">{topicsLoading ? <div className="p-4 space-y-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-12 skeleton rounded-lg" />)}</div> : hotTopics.length ? <TopicList topics={hotTopics} /> : <div className="p-8 text-center text-sm text-base-content/50">{topicsError || '暂无热门帖子。'}</div>}</div></section><section><div className="flex items-end justify-between gap-3 mb-4"><div><h2 className="text-lg font-bold">全部小组</h2><p className="text-xs text-base-content/50 mt-1">继续探索其他小组。</p></div><button className="btn btn-xs btn-ghost" disabled={allGroupsLoading} type="button" onClick={() => void loadAllGroups()}>刷新</button></div>{allGroupsLoading ? <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-24 rounded-xl skeleton" />)}</div> : allGroups.length ? <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{allGroups.map(group => <GroupCard group={group} key={group.id} />)}</div> : <div className="panel empty-state"><h3>{allGroupsError || '暂无小组数据'}</h3><p>可以点击刷新重新获取。</p></div>}</section></>}
  </div>
}
