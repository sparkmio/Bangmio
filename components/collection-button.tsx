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
  return <div className="collection-control"><button className="button primary" type="button" onClick={() => setOpen(value => !value)} disabled={saving}>{saving ? '保存中…' : label} <span className="chevron">⌄</span></button>{open ? <div className="collection-menu" role="menu">{options.map(([value, text]) => <button key={value} className={value === status ? 'selected' : ''} onClick={() => select(value)} type="button" role="menuitem">{text}{value === status ? ' ✓' : ''}</button>)}</div> : null}{message ? <div className="action-message">{message}</div> : null}</div>
}

export function CollectionEditor({ animeId }: { animeId: number }) {
  const { isAuthenticated, request } = useAuth()
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

  return <section className="panel collection-editor">
    <div><div className="eyebrow">My collection</div><h2>我的收藏</h2><p>状态值已严格对应 Bangumi：<b>看过 = 2</b>，<b>在看 = 3</b>。</p></div>
    <div className="collection-editor-actions"><CollectionButton animeId={animeId} initialStatus={Number(collection?.type || 0)} onSaved={next => setCollection(next)} /></div>
    {isAuthenticated ? <form className="form-stack collection-details" onSubmit={saveDetails}><label>评分（0 为未评分）<select className="bangmio-input" value={rating} onChange={event => setRating(Number(event.target.value))}>{Array.from({ length: 11 }, (_, value) => <option value={value} key={value}>{value === 0 ? '未评分' : `${value} 分`}</option>)}</select></label><label>短评<textarea className="bangmio-input" rows={3} maxLength={2000} value={comment} onChange={event => setComment(event.target.value)} placeholder="写点观后感…" /></label><button className="button ghost" type="submit" disabled={busy}>{busy ? '保存中…' : '保存评分与短评'}</button></form> : <div className="collection-guest-hint"><span>登录后可以记录进度、评分和短评。</span><Link className="text-link" href={`/login?redirect=/anime/${animeId}`}>登录后继续 →</Link></div>}
    {message ? <p className="action-message">{message}</p> : null}
  </section>
}
