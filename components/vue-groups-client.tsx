'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './auth-provider'
import { apiFetch } from '@/lib/api'

type Group = {
  id: number | string
  name?: string
  title?: string
  avatar?: string
  icon?: string
  description?: string
  summary?: string
  member_count?: number | string | null
  topic_count?: number | string | null
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
  reply_count?: number | string | null
  replies?: unknown
  group?: { name?: string }
}

function text(value: unknown, fallback = ''): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value))
    return value
      .map(item => text(item))
      .filter(Boolean)
      .join(' / ')
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return text(
      record.name ?? record.title ?? record.label ?? record.text ?? record.value,
      fallback
    )
  }
  return fallback
}
function groupTitle(group: Group) {
  return text(group.name ?? group.title, '未命名小组')
}
function count(value: unknown): number | null {
  if (Array.isArray(value)) return value.length
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^\s*\d[\d,]*\s*$/.test(value))
    return Number(value.replace(/,/g, ''))
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return count(record.count ?? record.total ?? record.length)
  }
  return null
}
function memberLabel(value: unknown) {
  const number = count(value)
  return number !== null ? `${number.toLocaleString()} 成员` : '成员数暂不可用'
}
function replyLabel(value: unknown) {
  const number = count(value)
  return number !== null ? `${number} 回复` : '回复数暂不可用'
}
function normalizeGroup(value: unknown, index = 0): Group | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  const id = item.id ?? item.group_id ?? item.slug ?? index
  return {
    ...item,
    id: typeof id === 'string' || typeof id === 'number' ? id : index,
    name: text(item.name ?? item.title, '未命名小组'),
    avatar: text(item.avatar ?? item.icon),
    description: text(item.description ?? item.desc ?? item.summary)
  } as Group
}
function normalizeTopic(value: unknown, index = 0): Topic | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  const id = item.id ?? item.topic_id ?? index
  return {
    ...item,
    id: typeof id === 'string' || typeof id === 'number' ? id : index,
    title: text(item.title ?? item.name, '未命名话题'),
    group_name: text(
      item.group_name ?? (item.group as Record<string, unknown> | undefined)?.name,
      '小组'
    ),
    author: text(item.author ?? (item.creator as Record<string, unknown> | undefined)?.nickname),
    last_reply_time: text(item.last_reply_time ?? item.updated_at),
    reply_count: count(item.reply_count ?? item.replies)
  } as Topic
}
function arrayFrom(value: unknown, key?: string) {
  const source = Array.isArray(value)
    ? value
    : key && value && typeof value === 'object'
      ? (value as Record<string, unknown>)[key]
      : []
  return Array.isArray(source) ? source : []
}

function GroupCard({ group, followed = false }: { group: Group; followed?: boolean }) {
  const title = groupTitle(group)
  const image = text(group.avatar || group.icon)
  const [failedImage, setFailedImage] = useState('')
  return (
    <Link
      href={`/group/${encodeURIComponent(String(group.id))}`}
      className={`group-card card bg-base-100 border ${followed ? 'border-primary/20 hover:border-primary/50' : 'border-base-300'} hover:shadow-hover transition-all`}
    >
      <div className="card-body p-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full overflow-hidden bg-base-200 shrink-0">
            {image && failedImage !== image && /^https?:\/\//i.test(image) ? (
              <img
                src={image}
                alt=""
                ref={element => {
                  if (element?.complete && !element.naturalWidth) setFailedImage(image)
                }}
                onError={() => setFailedImage(image)}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-base-content/40">
                {title.slice(0, 1)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{title}</p>
            <p className="community-group-description">
              {text(group.description || group.summary, '暂无小组简介')}
            </p>
            <span className="community-group-meta">
              {memberLabel(group.member_count ?? group.members)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
function TopicList({ topics }: { topics: Topic[] }) {
  return (
    <div className="community-topics">
      {topics.map((topic, index) => (
        <Link
          href={`/group/topic/${encodeURIComponent(String(topic.id || topic.topic_id || index))}`}
          className="community-topic-row"
          key={topic.id || topic.topic_id || index}
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium line-clamp-2">{text(topic.title, '未命名话题')}</p>
            <div className="mt-1 flex items-center gap-x-2 gap-y-1 flex-wrap text-xs text-base-content/50">
              <span>{text(topic.group_name || topic.group?.name, '小组')}</span>
              {text(topic.author) ? <span>{text(topic.author)}</span> : null}
              {text(topic.last_reply_time) ? <span>{text(topic.last_reply_time)}</span> : null}
            </div>
          </div>
          <span className="community-reply-count">
            {replyLabel(topic.reply_count ?? topic.replies)}
          </span>
        </Link>
      ))}
    </div>
  )
}

export function VueGroupsClient({
  initialGroups,
  initialTopics,
  groupsFailed = false,
  topicsFailed = false
}: {
  initialGroups: unknown
  initialTopics: unknown
  groupsFailed?: boolean
  topicsFailed?: boolean
}) {
  const { user, request } = useAuth()
  const initialGroupList = useMemo(
    () => arrayFrom(initialGroups).map(normalizeGroup).filter(Boolean) as Group[],
    [initialGroups]
  )
  const initialTopicList = useMemo(
    () => arrayFrom(initialTopics).map(normalizeTopic).filter(Boolean) as Topic[],
    [initialTopics]
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Group[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [followedGroups, setFollowedGroups] = useState<Group[]>([])
  const [followedError, setFollowedError] = useState('')
  const searchGeneration = useRef(0)
  const searchController = useRef<AbortController | null>(null)
  const followedGeneration = useRef(0)
  const [followedLoading, setFollowedLoading] = useState(false)
  const [allGroups, setAllGroups] = useState<Group[]>(initialGroupList)
  const [allGroupsLoading, setAllGroupsLoading] = useState(false)
  const [allGroupsError, setAllGroupsError] = useState(
    groupsFailed ? '小组列表加载失败，请点击刷新重试' : ''
  )
  const [hotTopics, setHotTopics] = useState<Topic[]>(initialTopicList)
  const [topicsLoading, setTopicsLoading] = useState(false)
  const [topicsError, setTopicsError] = useState(
    topicsFailed ? '热门话题加载失败，请点击刷新重试' : ''
  )
  const currentUsername = text(user?.username)
  const isSearching = Boolean(searchQuery.trim())

  const loadFollowedGroups = useCallback(async () => {
    const generation = ++followedGeneration.current
    if (!currentUsername) {
      setFollowedGroups([])
      setFollowedLoading(false)
      return
    }
    setFollowedLoading(true)
    setFollowedError('')
    try {
      const payload = await request<unknown>(
        `/user/${encodeURIComponent(currentUsername)}/groups`,
        {},
        { authenticate: false }
      )
      // The list response is sufficient for cards; do not fetch every group again.
      const groups = arrayFrom(payload?.data).map(normalizeGroup).filter(Boolean) as Group[]
      if (generation === followedGeneration.current) setFollowedGroups(groups)
    } catch {
      if (generation === followedGeneration.current)
        setFollowedError('关注的小组读取失败，请重试。')
    } finally {
      if (generation === followedGeneration.current) setFollowedLoading(false)
    }
  }, [currentUsername, request])

  const searchGroups = useCallback(async () => {
    const generation = ++searchGeneration.current
    searchController.current?.abort()
    const keyword = searchQuery.trim()
    if (!keyword) {
      setSearchResults([])
      setSearchError('')
      setSearchLoading(false)
      return
    }
    const controller = new AbortController()
    searchController.current = controller
    setSearchLoading(true)
    setSearchError('')
    try {
      const payload = await apiFetch<unknown>(
        '/groups/search?keyword=' + encodeURIComponent(keyword),
        { signal: controller.signal }
      )
      if (generation === searchGeneration.current)
        setSearchResults(
          arrayFrom(payload?.data, 'results').map(normalizeGroup).filter(Boolean) as Group[]
        )
    } catch (error) {
      if (generation !== searchGeneration.current || controller.signal.aborted) return
      setSearchResults([])
      setSearchError(error instanceof Error ? error.message : '搜索失败')
    } finally {
      if (generation === searchGeneration.current) setSearchLoading(false)
    }
  }, [searchQuery])
  const loadAllGroups = useCallback(async () => {
    setAllGroupsLoading(true)
    setAllGroupsError('')
    try {
      const payload = await apiFetch<unknown>('/groups')
      const groups = arrayFrom(payload?.data, 'groups')
        .map(normalizeGroup)
        .filter(Boolean) as Group[]
      setAllGroups(groups)
      if (!groups.length) setAllGroupsError('')
    } catch (error) {
      setAllGroupsError(error instanceof Error ? error.message : '小组列表加载失败')
    } finally {
      setAllGroupsLoading(false)
    }
  }, [])
  const loadHotTopics = useCallback(async () => {
    setTopicsLoading(true)
    setTopicsError('')
    try {
      const payload = await apiFetch<unknown>('/groups/discover')
      const topics = arrayFrom(payload?.data, 'topics')
        .map(normalizeTopic)
        .filter(Boolean) as Topic[]
      setHotTopics(topics)
      if (!topics.length) setTopicsError('')
    } catch (error) {
      setTopicsError(error instanceof Error ? error.message : '热门话题加载失败')
    } finally {
      setTopicsLoading(false)
    }
  }, [])
  useEffect(() => {
    setFollowedGroups([])
    void loadFollowedGroups()
    return () => {
      followedGeneration.current += 1
    }
  }, [loadFollowedGroups])
  useEffect(() => {
    searchGeneration.current += 1
    searchController.current?.abort()
    setSearchResults([])
    setSearchError('')
    setSearchLoading(Boolean(searchQuery.trim()))
    if (!searchQuery.trim()) return
    const timer = window.setTimeout(() => void searchGroups(), 300)
    return () => {
      window.clearTimeout(timer)
      searchGeneration.current += 1
      searchController.current?.abort()
    }
  }, [searchQuery, searchGroups])

  return (
    <div className="community-home">
      <div className="community-heading">
        <div>
          <div className="eyebrow">BANGMIO / COMMUNITY</div>
          <h1>小组与讨论</h1>
          <p className="text-sm text-base-content/50 mt-1">
            查看关注的小组，参与讨论，发现新的兴趣。
          </p>
        </div>
        <div className="community-search">
          <input
            value={searchQuery}
            onChange={event => {
              searchGeneration.current += 1
              searchController.current?.abort()
              setSearchQuery(event.target.value)
            }}
            onKeyDown={event => {
              if (event.key === 'Enter') void searchGroups()
            }}
            type="search"
            placeholder="搜索感兴趣的小组"
            aria-label="搜索小组"
            className="input input-bordered input-sm w-48"
          />
          <button
            className="btn btn-sm btn-primary"
            disabled={searchLoading}
            type="button"
            onClick={() => void searchGroups()}
          >
            {searchLoading ? '搜索中' : '搜索'}
          </button>
        </div>
      </div>
      {isSearching ? (
        <section aria-labelledby="group-search-heading">
          <div className="flex items-center justify-between mb-4">
            <h2 id="group-search-heading" className="text-lg font-bold">
              搜索结果
            </h2>
            <button
              className="btn btn-xs btn-ghost"
              type="button"
              onClick={() => setSearchQuery('')}
            >
              返回小组首页
            </button>
          </div>
          {searchLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="h-24 rounded-xl skeleton" />
              ))}
            </div>
          ) : searchResults.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {searchResults.map(group => (
                <GroupCard group={group} key={group.id} />
              ))}
            </div>
          ) : (
            <div className="panel empty-state">
              <h3>{searchError || '未找到匹配的小组'}</h3>
              <p>换个关键词再试试。</p>
            </div>
          )}
        </section>
      ) : (
        <div className="community-layout">
          <section className="community-followed">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold">我关注的小组</h2>
                {currentUsername ? (
                  <p className="text-xs text-base-content/50 mt-1">{currentUsername} 参加的小组</p>
                ) : null}
              </div>
              <button
                className="btn btn-xs btn-ghost"
                disabled={followedLoading}
                type="button"
                onClick={() => void loadFollowedGroups()}
              >
                刷新
              </button>
            </div>
            {followedError ? (
              <p role="alert" className="community-error">
                {followedError}
              </p>
            ) : null}
            {followedLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="h-24 rounded-xl skeleton" />
                ))}
              </div>
            ) : followedError && !followedGroups.length ? (
              <div className="panel empty-state">
                <h3>暂时无法读取小组</h3>
                <p>这不代表你没有关注的小组，请点击上方刷新重试。</p>
              </div>
            ) : followedGroups.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {followedGroups.map(group => (
                  <GroupCard followed group={group} key={group.id} />
                ))}
              </div>
            ) : (
              <div className="panel empty-state compact-empty">
                <h3>{currentUsername ? '还没有关注的小组' : '登录后查看关注的小组'}</h3>
                <p>
                  {currentUsername
                    ? '去下方发现感兴趣的小组。'
                    : '登录并绑定 Bangumi，查看你参加的小组。'}
                </p>
                {!currentUsername ? (
                  <Link className="button primary" href="/login?redirect=/groups">
                    登录后查看
                  </Link>
                ) : null}
              </div>
            )}
          </section>
          <section className="community-discussions">
            <div className="flex items-end justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold">正在讨论</h2>
                <p className="text-xs text-base-content/50 mt-1">来自 Bangumi 小组发现页。</p>
              </div>
              <button
                className="btn btn-xs btn-ghost"
                disabled={topicsLoading}
                type="button"
                onClick={() => void loadHotTopics()}
              >
                刷新
              </button>
            </div>
            {topicsError && hotTopics.length ? <p role="alert">{topicsError}</p> : null}
            <div className="card bg-base-100 border border-base-300 overflow-hidden">
              {topicsLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 6 }, (_, index) => (
                    <div key={index} className="h-12 skeleton rounded-lg" />
                  ))}
                </div>
              ) : hotTopics.length ? (
                <TopicList topics={hotTopics} />
              ) : (
                <div className="p-8 text-center text-sm text-base-content/50">
                  {topicsError || '暂无热门帖子。'}
                </div>
              )}
            </div>
          </section>
          <section className="community-directory">
            <div className="flex items-end justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold">发现小组</h2>
                <p className="text-xs text-base-content/50 mt-1">继续探索其他小组。</p>
              </div>
              <button
                className="btn btn-xs btn-ghost"
                disabled={allGroupsLoading}
                type="button"
                onClick={() => void loadAllGroups()}
              >
                刷新
              </button>
            </div>
            {allGroupsError && allGroups.length ? <p role="alert">{allGroupsError}</p> : null}
            {allGroupsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: 8 }, (_, index) => (
                  <div key={index} className="h-24 rounded-xl skeleton" />
                ))}
              </div>
            ) : allGroups.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allGroups.map(group => (
                  <GroupCard group={group} key={group.id} />
                ))}
              </div>
            ) : (
              <div className="panel empty-state">
                <h3>{allGroupsError || '暂无小组数据'}</h3>
                <p>可以点击刷新重新获取。</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
