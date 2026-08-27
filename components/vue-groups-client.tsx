'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './auth-provider'

type Group = {
  id: number | string
  name?: string
  title?: string
  avatar?: string
  icon?: string
  description?: string
  summary?: string
  member_count?: number | string
  topic_count?: number | string
  members?: unknown
  topics?: unknown
}

type Topic = {
  id?: number | string
  topic_id?: number | string
  title?: string
  group_name?: string
  author?: string
  last_reply_time?: string
  reply_count?: number | string
  replies?: unknown
  group?: { name?: string }
}

function groupTitle(group: Group) {
  return group.name || group.title || '未命名小组'
}

function count(value: unknown) {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (Array.isArray(value)) return value.length
  if (value && typeof value === 'object') {
    const record = value as { count?: number; total?: number }
    return record.count ?? record.total ?? 0
  }
  return 0
}

function memberLabel(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0
    ? `${number.toLocaleString()} 成员`
    : '成员数暂不可用'
}

function GroupCard({ group, followed = false }: { group: Group; followed?: boolean }) {
  const image = group.avatar || group.icon
  return (
    <Link
      href={`/group/${group.id}`}
      className={`card bg-base-100 border ${followed ? 'border-primary/20 hover:border-primary/50' : 'border-base-300'} hover:shadow-hover transition-all`}
    >
      <div className="card-body p-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full overflow-hidden bg-base-200 shrink-0">
            {image ? (
              <img
                src={image}
                alt={groupTitle(group)}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-base-content/40">
                {groupTitle(group).slice(0, 1)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{groupTitle(group)}</p>
            <p className="text-xs text-base-content/50 mt-1 line-clamp-1">
              {memberLabel(group.member_count ?? group.members)} · {group.description || group.summary || '暂无简介'}
            </p>
          </div>
        </div>
      </div>
    </Link>
  )
}

function TopicList({ topics }: { topics: Topic[] }) {
  return (
    <div className="divide-y divide-base-300">
      {topics.map((topic, index) => {
        const id = topic.id || topic.topic_id
        return (
          <Link
            href={`/group/topic/${id}`}
            className="p-4 flex items-start gap-3 hover:bg-base-200/60 transition-colors"
            key={id || index}
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium line-clamp-1">{topic.title || '未命名话题'}</p>
              <div className="mt-1 flex items-center gap-x-2 gap-y-1 flex-wrap text-xs text-base-content/50">
                <span>{topic.group_name || topic.group?.name || '小组'}</span>
                {topic.author ? <span>{topic.author}</span> : null}
                {topic.last_reply_time ? <span>{topic.last_reply_time}</span> : null}
              </div>
            </div>
            <span className="badge badge-sm badge-primary badge-outline whitespace-nowrap">
              {count(topic.reply_count ?? topic.replies)} 回复
            </span>
          </Link>
        )
      })}
    </div>
  )
}

export function VueGroupsClient({
  initialGroups,
  initialTopics
}: {
  initialGroups: Group[]
  initialTopics: Topic[]
}) {
  const { user, request } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Group[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const [followedGroups, setFollowedGroups] = useState<Group[]>([])
  const [followedLoading, setFollowedLoading] = useState(false)
  const [allGroups, setAllGroups] = useState(initialGroups)
  const [allGroupsLoading, setAllGroupsLoading] = useState(false)
  const [allGroupsDegraded, setAllGroupsDegraded] = useState(false)
  const [hotTopics, setHotTopics] = useState(initialTopics)
  const [topicsLoading, setTopicsLoading] = useState(false)

  const currentUsername = user?.username ? String(user.username) : ''
  const isSearching = Boolean(searchQuery.trim())

  const loadFollowedGroups = useCallback(async () => {
    if (!currentUsername) {
      setFollowedGroups([])
      return
    }
    setFollowedLoading(true)
    try {
      const payload = await request<Group[]>(
        `/user/${encodeURIComponent(currentUsername)}/groups`,
        {},
        { authenticate: false }
      )
      const groups = Array.isArray(payload.data) ? payload.data : []
      const enriched = await Promise.all(
        groups.map(async (group) => {
          try {
            const detail = await request<any>(`/groups/${group.id}`, {}, { authenticate: false })
            const value = detail.data || {}
            return {
              ...group,
              member_count: Number(value.member_count) > 0 ? value.member_count : group.member_count,
              avatar: value.avatar || group.avatar,
              topics: Array.isArray(value.topics) ? value.topics : []
            }
          } catch {
            return group
          }
        })
      )
      setFollowedGroups(enriched)
    } catch {
      setFollowedGroups([])
    } finally {
      setFollowedLoading(false)
    }
  }, [currentUsername, request])

  const searchGroups = useCallback(async () => {
    const keyword = searchQuery.trim()
    if (!keyword) {
      setSearchResults([])
      setSearchError(false)
      return
    }
    setSearchLoading(true)
    setSearchError(false)
    try {
      const response = await fetch(`/api/v1/groups/search?keyword=${encodeURIComponent(keyword)}`)
      const payload = await response.json()
      if (!response.ok) throw new Error('search failed')
      setSearchResults(Array.isArray(payload.data) ? payload.data : [])
    } catch {
      setSearchResults([])
      setSearchError(true)
    } finally {
      setSearchLoading(false)
    }
  }, [searchQuery])

  const loadAllGroups = useCallback(async () => {
    setAllGroupsLoading(true)
    setAllGroupsDegraded(false)
    try {
      const response = await fetch('/api/v1/groups')
      const payload = await response.json()
      if (!response.ok) throw new Error('groups failed')
      setAllGroups(Array.isArray(payload.data) ? payload.data : [])
      setAllGroupsDegraded(payload.degraded === true)
    } catch {
      setAllGroups([])
      setAllGroupsDegraded(true)
    } finally {
      setAllGroupsLoading(false)
    }
  }, [])

  const loadHotTopics = useCallback(async () => {
    setTopicsLoading(true)
    try {
      const response = await fetch('/api/v1/groups/discover')
      const payload = await response.json()
      if (!response.ok) throw new Error('discover failed')
      setHotTopics(Array.isArray(payload.data) ? payload.data : [])
    } catch {
      setHotTopics([])
    } finally {
      setTopicsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadFollowedGroups()
  }, [loadFollowedGroups])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setSearchError(false)
      return
    }
    const timer = window.setTimeout(() => void searchGroups(), 300)
    return () => window.clearTimeout(timer)
  }, [searchQuery, searchGroups])

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="flex items-center justify-between mb-8 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">小组</h1>
          <p className="text-sm text-base-content/50 mt-1">先看你关注的小组，再看看全站正在讨论什么。</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void searchGroups()
            }}
            type="search"
            placeholder="搜索小组..."
            className="input input-sm input-bordered w-48"
          />
          <button className="btn btn-sm btn-primary" disabled={searchLoading} type="button" onClick={() => void searchGroups()}>
            {searchLoading ? '搜索中' : '搜索'}
          </button>
        </div>
      </div>

      {isSearching ? (
        <section aria-labelledby="group-search-heading">
          <div className="flex items-center justify-between mb-4">
            <h2 id="group-search-heading" className="text-lg font-bold">搜索结果</h2>
            <button className="btn btn-xs btn-ghost" type="button" onClick={() => setSearchQuery('')}>返回小组首页</button>
          </div>
          {searchLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-24 rounded-xl skeleton" />)}
            </div>
          ) : searchResults.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {searchResults.map((group) => <GroupCard group={group} key={group.id} />)}
            </div>
          ) : (
            <div className="py-16 text-center text-base-content/50">
              {searchError ? '搜索小组失败，请稍后重试' : '未找到匹配的小组'}
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="mb-8" aria-labelledby="followed-groups-heading">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 id="followed-groups-heading" className="text-lg font-bold">我关注的小组</h2>
                {currentUsername ? <p className="text-xs text-base-content/50 mt-1">{currentUsername} 参加的小组 · 成员数来自 Bangumi 的个人小组列表</p> : null}
              </div>
              <button className="btn btn-xs btn-ghost" disabled={followedLoading} type="button" onClick={() => void loadFollowedGroups()}>刷新</button>
            </div>
            {followedLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 3 }, (_, index) => <div key={index} className="h-24 rounded-xl skeleton" />)}
              </div>
            ) : followedGroups.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {followedGroups.map((group) => <GroupCard followed group={group} key={group.id} />)}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-base-300 p-8 text-center text-sm text-base-content/50">登录 Bangmio 并绑定 Bangumi 后，这里会显示你参加的小组。</div>
            )}
          </section>

          <section className="mb-10" aria-labelledby="hot-topics-heading">
            <div className="flex items-end justify-between gap-3 mb-4">
              <div>
                <h2 id="hot-topics-heading" className="text-lg font-bold">所有小组的热门帖子</h2>
                <p className="text-xs text-base-content/50 mt-1">来自 Bangumi 小组发现页，按当前回复数排序。</p>
              </div>
              <button className="btn btn-xs btn-ghost" disabled={topicsLoading} type="button" onClick={() => void loadHotTopics()}>刷新</button>
            </div>
            <div className="card bg-base-100 border border-base-300 overflow-hidden">
              {topicsLoading ? (
                <div className="p-4 space-y-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-12 skeleton rounded-lg" />)}</div>
              ) : hotTopics.length ? <TopicList topics={hotTopics} /> : <div className="p-8 text-center text-sm text-base-content/50">暂无热门帖子。</div>}
            </div>
          </section>

          <section aria-labelledby="all-groups-heading">
            <div className="flex items-end justify-between gap-3 mb-4">
              <div>
                <h2 id="all-groups-heading" className="text-lg font-bold">全部小组</h2>
                <p className="text-xs text-base-content/50 mt-1">继续探索其他小组。</p>
              </div>
              <button className="btn btn-xs btn-ghost" disabled={allGroupsLoading} type="button" onClick={() => void loadAllGroups()}>刷新</button>
            </div>
            {allGroupsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-24 rounded-xl skeleton" />)}</div>
            ) : allGroups.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{allGroups.map((group) => <GroupCard group={group} key={group.id} />)}</div>
            ) : (
              <div className="rounded-xl border border-dashed border-base-300 p-8 text-center text-sm text-base-content/50">{allGroupsDegraded ? '全部小组暂时无法获取，请稍后刷新。' : '暂无小组数据。'}</div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
