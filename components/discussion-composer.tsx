'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from './auth-provider'

type ComposerMode = 'comment' | 'reply' | 'talkbox' | 'person-talkbox' | 'topic' | 'group-topic' | 'group-reply'

type ComposerProps = { subjectId?: number; topicId?: number; groupId?: string | number; mode?: ComposerMode }

export function DiscussionComposer({ subjectId, topicId, groupId, mode = 'comment' }: ComposerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isAuthenticated, isBound, request } = useAuth()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const isTopic = mode === 'topic' || mode === 'group-topic'

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!isAuthenticated) {
      const current = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ''}`
      router.push(`/login?redirect=${encodeURIComponent(current)}`)
      return
    }
    if (!isBound) {
      setMessage('请先绑定 Bangumi 账号后再发言')
      return
    }
    if (!content.trim() || (isTopic && !title.trim())) { setMessage(isTopic ? '标题和正文不能为空' : '内容不能为空'); return }
    const endpoint = mode === 'reply'
      ? `/comments/topic/${topicId}/reply`
      : mode === 'group-reply'
        ? `/groups/topic/${topicId}/reply`
        : mode === 'group-topic'
          ? `/groups/${encodeURIComponent(String(groupId || ''))}/topic`
      : mode === 'talkbox'
        ? `/comments/subject/${subjectId}/talkbox`
        : mode === 'person-talkbox'
          ? `/comments/person/${subjectId}/talkbox`
          : mode === 'topic'
            ? `/comments/subject/${subjectId}/topic`
            : `/comments/subject/${subjectId}/comment`
    setBusy(true)
    setMessage('')
    try {
      await request(endpoint, { method: 'POST', body: JSON.stringify(isTopic ? { title: title.trim(), content: content.trim() } : { content: content.trim() }) })
      setTitle('')
      setContent('')
      setMessage('已发布')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '发布失败')
    } finally {
      setBusy(false)
    }
  }

  return <form className="panel composer" onSubmit={submit}>
    {isTopic ? <input className="bangmio-input" value={title} onChange={event => setTitle(event.target.value)} placeholder="话题标题" maxLength={120} /> : null}
    <textarea className="bangmio-input" value={content} onChange={event => setContent(event.target.value)} placeholder={mode === 'reply' || mode === 'group-reply' ? '写下回复…' : '分享你的想法…'} rows={4} maxLength={20000} required />
    <div className="composer-footer"><span>{message}</span><button className="button primary" type="submit" disabled={busy}>{busy ? '发布中…' : isTopic ? '发布话题' : '发布'}</button></div>
  </form>
}
