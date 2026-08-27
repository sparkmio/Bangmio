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
  return <div className="relative inline-block"><button className="btn btn-primary" type="button" onClick={() => setOpen(value => !value)} disabled={saving}>{saving ? '保存中…' : label} <span aria-hidden="true">⌄</span></button>{open ? <div className="absolute left-0 top-full z-20 mt-1 w-32 rounded-lg border border-base-300 bg-base-100 p-1 shadow-xl" role="menu">{options.map(([value, text]) => <button key={value} className={value === status ? 'w-full rounded-md px-3 py-2 text-left text-sm bg-primary/10 text-primary' : 'w-full rounded-md px-3 py-2 text-left text-sm hover:bg-base-200'} onClick={() => select(value)} type="button" role="menuitem">{text}{value === status ? ' ✓' : ''}</button>)}</div> : null}{message ? <div className="text-xs text-error mt-1">{message}</div> : null}</div>
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

  return <section className="rounded-xl border border-base-300/70 bg-base-100/70 p-4 shadow-sm">
    <div><h2 className="text-sm font-semibold text-base-content/80">我的记录</h2></div>
    <div className="mt-4"><CollectionButton animeId={animeId} initialStatus={Number(collection?.type || 0)} onSaved={next => setCollection(next)} /></div>
    {isAuthenticated ? <form className="flex flex-col gap-3 mt-4" onSubmit={saveDetails}><label>评分（0 为未评分）<select className="select select-bordered w-full" value={rating} onChange={event => setRating(Number(event.target.value))}>{Array.from({ length: 11 }, (_, value) => <option value={value} key={value}>{value === 0 ? '未评分' : `${value} 分`}</option>)}</select></label><label>短评<textarea className="textarea textarea-bordered w-full" rows={3} maxLength={2000} value={comment} onChange={event => setComment(event.target.value)} placeholder="写点观后感…" /></label><button className="btn btn-outline" type="submit" disabled={busy}>{busy ? '保存中…' : '保存评分与短评'}</button></form> : <div className="flex items-center justify-between gap-3 mt-4 text-sm text-base-content/60"><span>登录后可以记录进度、评分和短评。</span><Link className="link link-primary" href={`/login?redirect=/anime/${animeId}`}>登录后继续 →</Link></div>}
    {message ? <p className="text-sm text-primary mt-3">{message}</p> : null}
  </section>
}
