'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Collection } from '@/lib/types'
import { useAuth } from './auth-provider'

const options = [
  [1, '想看'],
  [2, '看过'],
  [3, '在看'],
  [4, '搁置'],
  [5, '抛弃']
] as const

export function collectionStatusLabel(status: number) {
  return options.find(([value]) => value === status)?.[1] || '收藏'
}

export function CollectionButton({ animeId, initialStatus = 0, onSaved }: { animeId: number; initialStatus?: number; onSaved?: (collection: Collection) => void }) {
  const router = useRouter()
  const { ready, isAuthenticated, request } = useAuth()
  const [status, setStatus] = useState(initialStatus)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!ready || !isAuthenticated) return
    let alive = true
    request<Collection>(`/collection/${animeId}`).then(payload => {
      if (alive && payload.data?.type) setStatus(Number(payload.data.type))
    }).catch(() => undefined)
    return () => { alive = false }
  }, [animeId, isAuthenticated, ready, request])

  async function select(nextStatus: number) {
    if (!isAuthenticated) { router.push(`/login?redirect=/anime/${animeId}`); return }
    const previous = status
    setStatus(nextStatus); setSaving(true); setOpen(false); setMessage('')
    try {
      const payload = await request<Collection>(`/collection/${animeId}`, { method: 'POST', body: JSON.stringify({ status: nextStatus }) })
      onSaved?.(payload.data || { subject_id: animeId, type: nextStatus })
    } catch (error) {
      setStatus(previous)
      setMessage(error instanceof Error ? error.message : '保存收藏状态失败')
    } finally { setSaving(false) }
  }

  const label = useMemo(() => collectionStatusLabel(status), [status])
  return <div className="bm-collection-status"><button className="bm-collection-status-button" type="button" onClick={() => setOpen(value => !value)} disabled={saving}>{saving ? '保存中…' : label} <span aria-hidden="true">⌄</span></button>{open ? <div className="bm-collection-menu" role="menu">{options.map(([value, text]) => <button key={value} className={value === status ? 'is-active' : ''} onClick={() => select(value)} type="button" role="menuitem">{text}{value === status ? ' ✓' : ''}</button>)}</div> : null}{message ? <div className="bm-collection-error">{message}</div> : null}</div>
}

export function CollectionEditor({ animeId }: { animeId: number }) {
  const { ready, isAuthenticated, request } = useAuth()
  const router = useRouter()
  const [collection, setCollection] = useState<Collection | null>(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!isAuthenticated) return
    let alive = true
    request<Collection>(`/collection/${animeId}`).then(payload => {
      if (!alive || !payload.data) return
      setCollection(payload.data); setRating(Number(payload.data.rate || 0)); setComment(String(payload.data.comment || ''))
    }).catch(() => undefined)
    return () => { alive = false }
  }, [animeId, isAuthenticated, request])

  async function saveDetails(event: React.FormEvent) {
    event.preventDefault()
    if (!isAuthenticated) { router.push(`/login?redirect=/anime/${animeId}`); return }
    setBusy(true); setMessage('')
    try {
      const payload = await request<Collection>(`/collection/${animeId}`, { method: 'POST', body: JSON.stringify({ rating, comment }) })
      setCollection(payload.data || collection); setMessage('评分和短评已保存')
    } catch (error) { setMessage(error instanceof Error ? error.message : '保存失败') } finally { setBusy(false) }
  }

  function chooseRating(nextRating: number) {
    setRating(current => current === nextRating ? 0 : nextRating)
    setMessage('')
  }

  if (!ready) return <section className="bm-collection-editor is-loading"><p>正在读取收藏记录…</p></section>

  return <section className="bm-collection-editor">
    <header className="bm-collection-head"><div><h2>我的收藏</h2><p>记录收藏状态、评分和短评</p></div></header>
    {isAuthenticated ? <>
      <div className="bm-collection-toolbar"><CollectionButton animeId={animeId} initialStatus={Number(collection?.type || 0)} onSaved={next => setCollection(next)} /><div className="bm-collection-rating"><span>评分</span><div className="bm-rating-picker" role="radiogroup" aria-label="我的评分"><span className="bm-rating-picker-stars" aria-hidden="true"><span className="bm-rating-picker-base">★★★★★</span><span className="bm-rating-picker-fill" style={{ width: `${rating / 10 * 100}%` }}>★★★★★</span></span><div className="bm-rating-picker-hitboxes">{Array.from({ length: 10 }, (_, index) => { const value = index + 1; return <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value / 2} 星（${value} 分）`} className={rating === value ? 'is-selected' : ''} onClick={() => chooseRating(value)}><span aria-hidden="true" /></button> })}</div></div><small>{rating ? `${rating} 分 · ${(rating / 2).toFixed(1)} 星` : '未评分'}</small></div></div>
      <form className="bm-collection-form" onSubmit={saveDetails}>
        <label className="bm-collection-comment"><span>短评</span><textarea rows={2} maxLength={2000} value={comment} onChange={event => setComment(event.target.value)} placeholder="写点观后感…" /></label>
        <div className="bm-collection-actions"><span role="status">{message}</span><button type="submit" disabled={busy}>{busy ? '保存中…' : '保存记录'}</button></div>
      </form>
    </> : <div className="bm-collection-login"><span>登录后可以记录进度、评分和短评。</span><Link href={`/login?redirect=/anime/${animeId}`}>登录后继续 →</Link></div>}
  </section>
}
