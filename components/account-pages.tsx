'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { Collection, Subject, User } from '@/lib/types'
import { imageUrl, displayName } from '@/lib/api'
import { CollectionButton, collectionStatusLabel } from './collection-button'
import { useAuth } from './auth-provider'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { ready, isAuthenticated } = useAuth()
  if (!ready) return <div className="panel empty-state"><h3>正在读取登录状态…</h3></div>
  if (!isAuthenticated) return <div className="panel empty-state"><h3>请先登录</h3><p>登录后才能查看你的番组空间。</p><Link className="button primary" href="/login">去登录</Link></div>
  return <>{children}</>
}

function asList(value: unknown): Collection[] { return Array.isArray(value) ? value as Collection[] : [] }
function collectionId(collection: Collection) { return Number(collection.subject_id || collection.subject?.id || 0) }

function CollectionCard({ collection, controls = false, onSaved }: { collection: Collection; controls?: boolean; onSaved?: (collection: Collection) => void }) {
  const subject = collection.subject || {} as Subject
  const id = collectionId(collection)
  const image = imageUrl(subject.images)
  return <article className="list-card collection-card">{id ? <Link href={`/anime/${id}`} className="list-cover-link">{image ? <img className="list-cover" src={image} alt="" /> : <div className="list-cover cover-placeholder">B</div>}</Link> : null}<div className="collection-card-body"><Link href={id ? `/anime/${id}` : '/anime'}><h3>{displayName(subject) || `条目 #${id}`}</h3></Link><p>{collectionStatusLabel(Number(collection.type || 0))} · {collection.ep_status ? `第 ${collection.ep_status} 集` : '尚未记录进度'}</p>{collection.comment ? <p className="collection-comment">{collection.comment}</p> : null}{controls && id ? <CollectionButton animeId={id} initialStatus={Number(collection.type || 0)} onSaved={onSaved} /> : null}</div></article>
}

export function ProfilePage({ username }: { username?: string }) {
  const { user, isAuthenticated, request } = useAuth()
  const [profile, setProfile] = useState<User | null>(null)
  const [collections, setCollections] = useState<Collection[]>([])
  const [stats, setStats] = useState<Record<string, number> | null>(null)
  const [timeline, setTimeline] = useState<any[]>([])
  const [friends, setFriends] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const name = username || user?.username

  useEffect(() => {
    if (!isAuthenticated || !name) { setLoading(false); return }
    let alive = true
    setLoading(true); setError('')
    const suffix = username ? `&username=${encodeURIComponent(username)}` : ''
    Promise.all([
      username ? request<User>(`/user/${encodeURIComponent(name)}`) : Promise.resolve({ data: user }),
      request<Collection[]>(`/collection/list?offset=0&limit=100${suffix}`),
      request<Record<string, number>>('/collection/stats'),
      request<any[]>(`/user/${encodeURIComponent(name)}/timeline`).catch(() => ({ data: [] })),
      request<any[]>(`/user/${encodeURIComponent(name)}/friends`).catch(() => ({ data: [] })),
      request<any[]>(`/user/${encodeURIComponent(name)}/groups`).catch(() => ({ data: [] }))
    ]).then(([profileResult, collectionResult, statsResult, timelineResult, friendsResult, groupsResult]) => {
      if (!alive) return
      setProfile(profileResult.data || null); setCollections(asList(collectionResult.data)); setStats(statsResult.data || null)
      setTimeline(Array.isArray(timelineResult.data) ? timelineResult.data : []); setFriends(Array.isArray(friendsResult.data) ? friendsResult.data : []); setGroups(Array.isArray(groupsResult.data) ? groupsResult.data : [])
    }).catch(value => { if (alive) setError(value instanceof Error ? value.message : '个人页加载失败') }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [isAuthenticated, name, request, username, user])

  const recent = useMemo(() => collections.slice(0, 18), [collections])
  return <RequireAuth><div className="profile-header panel"><div className="avatar profile-avatar">{(profile?.nickname || profile?.username || '我').slice(0, 1)}</div><div><div className="eyebrow">Personal space</div><h1>{profile?.nickname || profile?.username || '我的番组空间'}</h1><p className="detail-original">{profile?.sign || '还没有签名。'}</p>{name ? <a className="text-link" href={`https://bgm.tv/user/${encodeURIComponent(name)}`} target="_blank" rel="noreferrer">在 Bangumi 查看公开主页 ↗</a> : null}</div></div>{loading ? <div className="panel empty-state"><h3>正在加载个人资料…</h3></div> : error ? <div className="panel error-state"><strong>个人页加载失败</strong><span>{error}</span></div> : <><div className="stats-row"><div className="stat"><strong>{stats?.wish ?? stats?.want ?? 0}</strong><span>想看</span></div><div className="stat"><strong>{stats?.doing ?? stats?.watching ?? 0}</strong><span>在看</span></div><div className="stat"><strong>{stats?.collect ?? stats?.completed ?? 0}</strong><span>看过</span></div><div className="stat"><strong>{stats?.total ?? collections.length}</strong><span>收藏总数</span></div></div><section><div className="section-heading"><div><div className="eyebrow">Collections</div><h2>收藏</h2><p>最近更新的收藏记录和观看进度。</p></div><Link className="text-link" href="/watching">查看在追 →</Link></div>{recent.length ? <div className="list-grid">{recent.map(collection => <CollectionCard collection={collection} key={collectionId(collection)} />)}</div> : <div className="panel empty-state"><h3>还没有收藏</h3><p>从找番页选择一部作品，开始记录吧。</p></div>}</section><section className="profile-secondary-grid"><div className="panel profile-section"><div className="section-heading compact-heading"><div><div className="eyebrow">Timeline</div><h2>时间胶囊</h2></div></div>{timeline.length ? <ul className="timeline-list">{timeline.slice(0, 10).map((item, index) => <li key={item.id || index}><strong>{item.action || item.type || '收藏更新'}</strong><span>{item.subject?.name_cn || item.subject?.name || item.title || item.created_at || ''}</span></li>)}</ul> : <p className="muted-copy">暂无可展示的公开动态。</p>}</div><div className="panel profile-section"><div className="section-heading compact-heading"><div><div className="eyebrow">Network</div><h2>好友与小组</h2></div></div><div className="mini-list">{friends.slice(0, 6).map((friend, index) => <a href={`https://bgm.tv/user/${encodeURIComponent(friend.username || friend.id)}`} target="_blank" rel="noreferrer" key={friend.username || index}>{friend.nickname || friend.username || 'Bangumi 用户'}</a>)}{groups.slice(0, 6).map((group, index) => <a href={`https://bgm.tv/group/${encodeURIComponent(group.id)}`} target="_blank" rel="noreferrer" key={group.id || index}>{group.name || group.title || '兴趣小组'}</a>)}{!friends.length && !groups.length ? <p className="muted-copy">暂无公开好友或小组。</p> : null}</div></div></section></>}</RequireAuth>
}

export function WatchingPage() {
  const { isAuthenticated, request } = useAuth()
  const [collections, setCollections] = useState<Collection[]>([])
  const [subjectType, setSubjectType] = useState(0)
  const [selectedId, setSelectedId] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const limit = 30

  async function load(nextOffset = 0, append = false) {
    if (!isAuthenticated) return
    setLoading(true)
    setError('')
    try {
      const type = subjectType ? `&subject_type=${subjectType}` : ''
      const payload = await request<Collection[]>(`/collection/list?offset=${nextOffset}&limit=${limit}&type=3${type}`)
      const data = asList(payload.data).filter(item => Number(item.subject?.type || item.subject_type || 0) !== 4)
      setCollections(current => append ? [...current, ...data] : data)
      if (!append) setSelectedId(data.length ? collectionId(data[0]) : 0)
      setOffset(nextOffset + data.length)
      setHasMore(data.length >= limit)
    } catch (value) {
      setError(value instanceof Error ? value.message : '在追列表加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load(0, false) }, [isAuthenticated, subjectType]) // status=3 is deliberately fixed: Bangumi 的“在看”。

  const selected = useMemo(() => collections.find(item => collectionId(item) === selectedId) || collections[0] || null, [collections, selectedId])
  const selectedSubject = selected?.subject || null
  const totalEpisodes = Number(selectedSubject?.eps || selectedSubject?.eps_count || selectedSubject?.total_episodes || 0)
  const watchedEpisodes = Number(selected?.ep_status || selected?.episode || 0)
  const episodeCount = Math.min(totalEpisodes || Math.max(watchedEpisodes, 12), 24)

  function mergeSaved(id: number, next: Collection) {
    setCollections(current => current.map(item => collectionId(item) === id ? {
      ...item,
      ...next,
      type: Number(next.type || next.status || item.type || 3),
      ep_status: Number(next.ep_status || next.episode || item.ep_status || 0),
      subject: next.subject || item.subject
    } : item))
  }

  const tabs = [
    { value: 0, label: '全部' },
    { value: 2, label: '动画' },
    { value: 6, label: '三次元' },
    { value: 1, label: '书籍' }
  ]

  return <RequireAuth>
    <div className="watching-heading">
      <div><h1>在追</h1><p>正在看的作品与观看进度</p></div>
      <Link className="text-link" href="/profile">查看全部收藏 →</Link>
    </div>
    <div className="watching-tabs" role="tablist" aria-label="媒介类型">
      {tabs.map(tab => <button key={tab.value} className={subjectType === tab.value ? 'active' : ''} type="button" onClick={() => setSubjectType(tab.value)}>{tab.label}</button>)}
    </div>

    {error ? <div className="error-state"><strong>在追列表加载失败</strong><span>{error}</span><button className="button ghost compact" type="button" onClick={() => void load(0, false)}>重试</button></div> : null}
    {loading && !collections.length ? <div className="panel empty-state"><h3>正在加载在追列表…</h3></div> : null}
    {!loading && !error && !collections.length ? <div className="panel empty-state"><h3>还没有在追条目</h3><p>把作品标为“在看”后，会显示在这里。</p><Link className="button primary" href="/anime">去找番</Link></div> : null}

    {collections.length ? <div className="watching-layout">
      <aside className="watching-list" aria-label="在追列表">
        {collections.map(collection => {
          const subject = collection.subject || {} as Subject
          const id = collectionId(collection)
          const image = imageUrl(subject.images)
          const total = Number(subject.eps || subject.eps_count || subject.total_episodes || 0)
          return <button className={id === collectionId(selected || {} as Collection) ? 'watching-list-item active' : 'watching-list-item'} key={id} type="button" onClick={() => setSelectedId(id)}>
            {image ? <img src={image} alt="" /> : <span className="watching-list-placeholder">B</span>}
            <span><strong>{displayName(subject) || `条目 #${id}`}</strong><small>[{Number(collection.ep_status || collection.episode || 0)}/{total || '?'}]</small></span>
          </button>
        })}
        {hasMore ? <button className="watching-load-more" disabled={loading} onClick={() => void load(offset, true)} type="button">{loading ? '加载中…' : '加载更多'}</button> : null}
      </aside>

      {selected && selectedSubject ? <article className="watching-detail">
        <div className="watching-detail-main">
          {imageUrl(selectedSubject.images) ? <img className="watching-detail-cover" src={imageUrl(selectedSubject.images)} alt="" /> : <div className="watching-detail-cover cover-placeholder">B</div>}
          <div className="watching-detail-copy">
            <div className="watching-detail-title"><div><h2>{displayName(selectedSubject)}</h2>{selectedSubject.name && selectedSubject.name_cn && selectedSubject.name !== selectedSubject.name_cn ? <p>{selectedSubject.name}</p> : null}</div><CollectionButton animeId={collectionId(selected)} initialStatus={Number(selected.type || 3)} onSaved={next => mergeSaved(collectionId(selected), next)} /></div>
            <div className="watching-links"><Link href={`/anime/${collectionId(selected)}/topics`}>参与讨论</Link><Link href={`/anime/${collectionId(selected)}/talkbox`}>观吐槽</Link><Link href={`/anime/${collectionId(selected)}`}>详情页</Link></div>
            {selected.comment ? <p className="watching-comment">“{selected.comment}”</p> : null}
          </div>
        </div>
        <div className="episode-progress">
          <p>播放进度 · 已看 {watchedEpisodes} / {totalEpisodes || '?'}</p>
          <div className="episode-buttons">
            {Array.from({ length: episodeCount }, (_, index) => index + 1).map(episode => <span className={episode <= watchedEpisodes ? 'watched' : ''} key={episode}>{String(episode).padStart(2, '0')}</span>)}
          </div>
          {totalEpisodes > 24 ? <small className="episode-note">这里只展示前 24 集，完整信息请进入详情页。</small> : null}
        </div>
      </article> : <div className="watching-detail empty-state"><h3>选择一部作品查看详情</h3></div>}
    </div> : null}
  </RequireAuth>
}
export function SettingsPage() {
  const { account, isBangmioUser, fetchBgmUserProfile, logout, request } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function changePassword(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('')
    try { await request('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }, { authenticate: true }); setCurrentPassword(''); setNewPassword(''); setMessage('密码已更新') } catch (error) { setMessage(error instanceof Error ? error.message : '修改密码失败') } finally { setBusy(false) }
  }
  return <RequireAuth><div className="section-heading"><div><div className="eyebrow">Preferences</div><h1>设置</h1><p>管理账号、Bangumi 绑定和登录安全。</p></div></div><div className="settings-grid"><div className="panel profile-section"><h2>{account?.email || '当前账号'}</h2><p className="muted-copy">{isBangmioUser ? '当前使用 Bangmio 账号。可在这里刷新已绑定的 Bangumi 资料。' : '当前使用 Bangumi Access Token 直登；账号密码设置不可用。'}</p>{isBangmioUser ? <><button className="button ghost" type="button" onClick={() => void fetchBgmUserProfile().then(value => setMessage(value ? 'Bangumi 资料已刷新' : '未能刷新资料，请检查绑定状态'))}>刷新 Bangumi 资料</button><Link className="text-link settings-link" href="/bind-bangumi">重新绑定 Bangumi →</Link></> : null}<button className="button ghost danger-button" type="button" onClick={logout}>退出当前账号</button></div>{isBangmioUser ? <form className="panel profile-section form-stack" onSubmit={changePassword}><div><div className="eyebrow">Security</div><h2>修改密码</h2></div><label>当前密码<input className="input" type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} required /></label><label>新密码<input className="input" type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} minLength={8} required /></label><button className="button primary" type="submit" disabled={busy}>{busy ? '保存中…' : '保存新密码'}</button></form> : null}</div>{message ? <p className="action-message">{message}</p> : null}</RequireAuth>
}
