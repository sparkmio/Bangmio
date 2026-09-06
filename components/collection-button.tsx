'use client'

import Link from 'next/link'
import { collectionOptions } from '@/lib/collection-options'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Collection } from '@/lib/types'
import { useAuth } from './auth-provider'

export function collectionStatusValue(collection?: Partial<Collection> | null) {
  const raw = collection?.status ?? collection?.collection_type ?? collection?.type
  const value = Number(raw)
  return Number.isInteger(value) && value >= 1 && value <= 5 ? value : 0
}

export function collectionRatingValue(collection?: Partial<Collection> | null) {
  const raw = collection?.rate ?? collection?.rating
  const value = Number(raw)
  return Number.isInteger(value) && value >= 0 && value <= 10 ? value : 0
}

export function collectionEpisodeValue(collection?: Partial<Collection> | null) {
  const raw = collection?.ep_status ?? collection?.episode
  const value = Number(raw)
  return Number.isSafeInteger(value) && value >= 0 ? value : 0
}

export function collectionStatusLabel(status: number, subjectType = 2) {
  return collectionOptions(subjectType).find(item => item.value === status)?.label || '收藏'
}

export function CollectionButton({
  animeId,
  subjectType = 2,
  initialStatus,
  disabled = false,
  onSavingChange,
  onSaved
}: {
  animeId: number
  subjectType?: number
  initialStatus?: number
  disabled?: boolean
  onSavingChange?: (saving: boolean) => void
  onSaved?: (collection: Collection) => void
}) {
  const options = collectionOptions(subjectType).map(item => [item.value, item.label] as const)
  const router = useRouter()
  const { ready, isAuthenticated, request } = useAuth()
  const [status, setStatus] = useState(() => collectionStatusValue({ type: initialStatus }))
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [loadFailed, setLoadFailed] = useState(false)
  const [loading, setLoading] = useState(initialStatus === undefined)
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    setStatus(collectionStatusValue({ type: initialStatus }))
  }, [initialStatus])

  useEffect(() => {
    if (!ready || !isAuthenticated || initialStatus !== undefined) {
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    setLoadFailed(false)
    setMessage('')
    request<Collection>(`/collection/${animeId}`)
      .then(payload => {
        if (!alive) return
        setLoadFailed(false)
        setStatus(collectionStatusValue(payload.data))
      })
      .catch(() => {
        if (!alive) return
        setLoadFailed(true)
        setMessage('收藏状态读取失败，请稍后重试')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [animeId, isAuthenticated, ready, request, initialStatus, loadAttempt])

  async function select(nextStatus: number) {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/anime/${animeId}`)
      return
    }
    if (saving || disabled || loading) return
    if (loadFailed) {
      setMessage('收藏状态读取失败，请先刷新页面重试')
      return
    }
    const previous = status
    setStatus(nextStatus)
    setSaving(true)
    onSavingChange?.(true)
    setOpen(false)
    setMessage('')
    try {
      const payload = await request<Collection>(`/collection/${animeId}`, {
        method: 'POST',
        body: JSON.stringify({ status: nextStatus })
      })
      onSaved?.(payload.data || { subject_id: animeId, type: nextStatus })
    } catch (error) {
      setStatus(previous)
      setMessage(error instanceof Error ? error.message : '保存收藏状态失败')
    } finally {
      setSaving(false)
      onSavingChange?.(false)
    }
  }

  const label = useMemo(() => collectionStatusLabel(status, subjectType), [status, subjectType])
  return (
    <div className="bm-collection-status">
      <button
        className="bm-collection-status-button"
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        disabled={!ready || saving || loadFailed || loading || disabled}
      >
        {loading ? '读取中…' : saving ? '保存中…' : label} <span aria-hidden="true">⌄</span>
      </button>
      {open ? (
        <div className="bm-collection-menu" aria-label="选择收藏状态">
          {options.map(([value, text]) => (
            <button
              key={value}
              className={value === status ? 'is-active' : ''}
              onClick={() => select(value)}
              disabled={saving || disabled}
              type="button"
            >
              {text}
              {value === status ? ' ✓' : ''}
            </button>
          ))}
        </div>
      ) : null}
      {message ? (
        <div className="bm-collection-error" role="alert">
          {message}
          {loadFailed ? (
            <button type="button" onClick={() => setLoadAttempt(value => value + 1)}>
              重试读取
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

type CollectionEditorProps = {
  animeId: number
  subjectType?: number
  episodes?: Array<{ sort?: number; name?: string; name_cn?: string }>
  totalEpisodes?: number
}

export function CollectionEditor(props: CollectionEditorProps) {
  const { isAuthenticated, user } = useAuth()
  return (
    <CollectionEditorState
      key={[props.animeId, isAuthenticated, user?.username || ''].join(':')}
      {...props}
    />
  )
}

function CollectionEditorState({
  animeId,
  subjectType = 2,
  episodes = [],
  totalEpisodes = 0
}: CollectionEditorProps) {
  const { ready, isAuthenticated, request } = useAuth()
  const router = useRouter()
  const [collection, setCollection] = useState<Collection | null>(null)
  const [rating, setRating] = useState(0)
  const [episode, setEpisode] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    if (!ready || !isAuthenticated) return
    let alive = true
    setLoadState('loading')
    setMessage('')
    request<Collection>('/collection/' + animeId)
      .then(payload => {
        if (!alive) return
        const next = payload.data || null
        setCollection(next)
        setRating(collectionRatingValue(next))
        setEpisode(collectionEpisodeValue(next))
        setComment(String(next?.comment || ''))
        setLoadState('ready')
      })
      .catch(() => {
        if (alive) setLoadState('error')
      })
    return () => {
      alive = false
    }
  }, [animeId, isAuthenticated, ready, request, loadAttempt])

  async function saveDetails(event: React.FormEvent) {
    event.preventDefault()
    if (!isAuthenticated) {
      router.push(`/login?redirect=/anime/${animeId}`)
      return
    }
    if (busy || loadState !== 'ready' || !collectionStatusValue(collection)) return
    setBusy(true)
    setMessage('')
    try {
      const payload = await request<Collection>(`/collection/${animeId}`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment })
      })
      setCollection(current => ({ ...current, ...payload.data }))
      setRating(collectionRatingValue(payload.data || collection))
      setEpisode(collectionEpisodeValue(payload.data || collection))
      setMessage('评分和短评已保存')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  function chooseRating(nextRating: number) {
    setRating(current => (current === nextRating ? 0 : nextRating))
    setMessage('')
  }

  function moveRating(delta: number) {
    setRating(current => Math.min(10, Math.max(0, current + delta)))
  }

  const rawTotal = Number(totalEpisodes || episodes.length || 0)
  const episodeTotal = Number.isSafeInteger(rawTotal) && rawTotal > 0 ? rawTotal : 0
  const [progressPage, setProgressPage] = useState(0)
  const pageSize = 100
  const maxPage = Math.max(0, Math.ceil(episodeTotal / pageSize) - 1)
  const currentPage = Math.min(progressPage, maxPage)
  const episodeItems = Array.from(
    { length: Math.min(pageSize, episodeTotal - currentPage * pageSize) },
    (_, index) => currentPage * pageSize + index + 1
  )
  useEffect(() => {
    setProgressPage(Math.max(0, Math.floor((episode - 1) / pageSize)))
  }, [animeId, episode])
  const watching = collectionStatusValue(collection) === 3
  const progressPercent = episodeTotal
    ? Math.min(100, Math.max(0, Math.round((episode / episodeTotal) * 100)))
    : 0

  async function updateEpisode(nextEpisode: number) {
    const bounded = Math.max(0, Math.min(episodeTotal, nextEpisode))
    if (bounded === episode || !isAuthenticated || busy || loadState !== 'ready') return
    const previous = episode
    setEpisode(bounded)
    setBusy(true)
    setMessage('')
    try {
      const payload = await request<Collection>(`/collection/${animeId}`, {
        method: 'POST',
        body: JSON.stringify({ episode: bounded })
      })
      setCollection(current => ({
        ...current,
        ...payload.data,
        ep_status: bounded,
        episode: bounded
      }))
      setEpisode(collectionEpisodeValue(payload.data) || bounded)
    } catch (error) {
      setEpisode(previous)
      setMessage(error instanceof Error ? error.message : '观看进度保存失败')
    } finally {
      setBusy(false)
    }
  }

  if (!ready || (isAuthenticated && loadState === 'loading'))
    return (
      <section className="bm-collection-editor is-loading">
        <p>正在读取收藏记录…</p>
      </section>
    )

  if (isAuthenticated && loadState === 'error')
    return (
      <section className="bm-collection-editor" data-ai-private="true" role="alert">
        <h2>收藏盒</h2>
        <p>收藏记录读取失败。为避免覆盖原有评分和短评，暂时不能编辑。</p>
        <button type="button" onClick={() => setLoadAttempt(value => value + 1)}>
          重试读取
        </button>
      </section>
    )

  return (
    <>
      <section
        className={`bm-collection-editor${isAuthenticated ? '' : ' is-guest'}`}
        data-ai-private="true"
      >
        <header className="bm-collection-head">
          <div>
            <h2>收藏盒</h2>
            <p>记录收藏状态、评分和短评</p>
          </div>
        </header>
        {isAuthenticated ? (
          <>
            <div className="bm-collection-toolbar">
              <CollectionButton
                animeId={animeId}
                disabled={busy}
                onSavingChange={setBusy}
                subjectType={subjectType}
                initialStatus={collectionStatusValue(collection)}
                onSaved={next =>
                  setCollection(current => ({
                    ...current,
                    ...next,
                    status: collectionStatusValue(next)
                  }))
                }
              />
              <div className="bm-collection-rating">
                <span>评分</span>
                <div
                  className="bm-rating-picker"
                  role="radiogroup"
                  tabIndex={-1}
                  aria-label="我的评分"
                  onKeyDown={event => {
                    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                      event.preventDefault()
                      moveRating(-1)
                    }
                    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                      event.preventDefault()
                      moveRating(1)
                    }
                  }}
                >
                  <div className="bm-rating-picker-stars">
                    {Array.from({ length: 10 }, (_, index) => {
                      const value = index + 1
                      return (
                        <button
                          key={value}
                          type="button"
                          disabled={busy}
                          role="radio"
                          aria-checked={rating === value}
                          aria-label={`${value} 分`}
                          className={rating >= value ? 'is-selected' : ''}
                          onClick={() => chooseRating(value)}
                        >
                          {rating >= value ? '★' : '☆'}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <small>{rating ? `${rating} 分` : '未评分'}</small>
              </div>
            </div>
            {!collectionStatusValue(collection) ? (
              <p role="status">请先选择收藏状态，再保存评分和短评。</p>
            ) : null}
            <form className="bm-collection-form" onSubmit={saveDetails}>
              <label className="bm-collection-comment">
                <span>短评</span>
                <textarea
                  disabled={busy}
                  rows={2}
                  maxLength={2000}
                  value={comment}
                  onChange={event => setComment(event.target.value)}
                  placeholder="写点观后感…"
                />
              </label>
              <div className="bm-collection-actions">
                <span role="status">{message}</span>
                <button type="submit" disabled={busy || !collectionStatusValue(collection)}>
                  {busy ? '保存中…' : '保存记录'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="bm-collection-login">
            <span>登录后可以记录进度、评分和短评。</span>
            <Link href={`/login?redirect=/anime/${animeId}`}>登录后继续 →</Link>
          </div>
        )}
      </section>
      {isAuthenticated && watching && episodeTotal ? (
        <section
          className="bm-watch-progress-card"
          aria-label="观看进度管理"
          data-ai-private="true"
        >
          <div className="bm-watch-progress-head">
            <div>
              <strong>观看进度管理</strong>
              <span>
                已看 {episode} / {episodeTotal} 集
              </span>
            </div>
            <button
              type="button"
              onClick={() => void updateEpisode(episodeTotal)}
              disabled={busy || episode === episodeTotal}
            >
              全部看过
            </button>
          </div>
          <div className="bm-watch-progress-track" aria-hidden="true">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
          {episodeTotal > pageSize ? (
            <nav aria-label="进度分页" className="bm-progress-pagination">
              <button
                type="button"
                disabled={currentPage === 0 || busy}
                onClick={() => setProgressPage(currentPage - 1)}
              >
                上一组
              </button>
              <label>
                跳到第{' '}
                <select
                  aria-label="进度页"
                  value={currentPage}
                  onChange={event => setProgressPage(Number(event.target.value))}
                >
                  {Array.from({ length: maxPage + 1 }, (_, i) => (
                    <option key={i} value={i}>
                      {i * pageSize + 1}–{Math.min(episodeTotal, (i + 1) * pageSize)} 集
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={currentPage === maxPage || busy}
                onClick={() => setProgressPage(currentPage + 1)}
              >
                下一组
              </button>
            </nav>
          ) : null}
          <div className="bm-watch-progress-episodes">
            {episodeItems.map(item => (
              <button
                key={item}
                type="button"
                className={item <= episode ? 'is-watched' : ''}
                aria-label={`标记看到第 ${item} 集`}
                aria-pressed={item <= episode}
                onClick={() => void updateEpisode(item)}
                disabled={busy}
              >
                {String(item).padStart(2, '0')}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </>
  )
}
