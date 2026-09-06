'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from './auth-provider'
import { RichText } from './rich-text'

type ComposerMode =
  'comment' | 'reply' | 'talkbox' | 'person-talkbox' | 'topic' | 'group-topic' | 'group-reply'

type ComposerProps = {
  subjectId?: number
  topicId?: number
  groupId?: string | number
  mode?: ComposerMode
}

export function DiscussionComposer({
  subjectId,
  topicId,
  groupId,
  mode = 'comment'
}: ComposerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { ready, isAuthenticated, isBound, request } = useAuth()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState(false)
  const [replyTarget, setReplyTarget] = useState<{ author: string; floor: string | number } | null>(
    null
  )
  const draftKey = useMemo(
    () => `bangmio-draft:${pathname}:${mode}:${topicId || subjectId || groupId || ''}`,
    [groupId, mode, pathname, subjectId, topicId]
  )
  const isTopic = mode === 'topic' || mode === 'group-topic'

  useEffect(() => {
    try {
      const draft = JSON.parse(window.localStorage.getItem(draftKey) || '{}') as {
        title?: string
        content?: string
      }
      if (draft.title) setTitle(draft.title)
      if (draft.content) setContent(draft.content)
    } catch {}
  }, [draftKey])

  useEffect(() => {
    try {
      if (title || content)
        window.localStorage.setItem(draftKey, JSON.stringify({ title, content }))
      else window.localStorage.removeItem(draftKey)
    } catch {}
  }, [content, draftKey, title])

  useEffect(() => {
    const handleReplyTarget = (event: Event) => {
      const detail = (event as CustomEvent<{ author?: string; floor?: string | number }>).detail
      if (!detail?.author) return
      const prefix = `@${detail.author}${detail.floor ? ` #${detail.floor}` : ''} `
      setReplyTarget({ author: detail.author, floor: detail.floor || '' })
      setContent(current =>
        current.trimStart().startsWith(prefix) ? current : `${prefix}${current}`
      )
      setPreview(false)
      window.setTimeout(
        () => document.querySelector<HTMLTextAreaElement>('#reply-composer textarea')?.focus(),
        0
      )
    }
    window.addEventListener('bangmio:reply-target', handleReplyTarget)
    return () => window.removeEventListener('bangmio:reply-target', handleReplyTarget)
  }, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    if (!isAuthenticated) {
      const current = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ''}`
      router.push(`/login?redirect=${encodeURIComponent(current)}`)
      return
    }
    if (!isBound) {
      setMessage('请先绑定 Bangumi 账号后再发言')
      return
    }
    if (!content.trim() || (isTopic && !title.trim())) {
      setMessage(isTopic ? '标题和正文不能为空' : '内容不能为空')
      return
    }
    const endpoint =
      mode === 'reply'
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
      await request(endpoint, {
        method: 'POST',
        body: JSON.stringify(
          isTopic ? { title: title.trim(), content: content.trim() } : { content: content.trim() }
        )
      })
      setTitle('')
      setContent('')
      setReplyTarget(null)
      try {
        window.localStorage.removeItem(draftKey)
      } catch {}
      setMessage('已发布')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '发布失败')
    } finally {
      setBusy(false)
    }
  }

  const returnTo = pathname + (searchParams.size ? '?' + searchParams.toString() : '')
  if (!ready)
    return (
      <aside className="panel composer" aria-busy="true">
        <p role="status">正在准备讨论区…</p>
      </aside>
    )
  if (!isAuthenticated)
    return (
      <aside className="panel composer">
        <h2 className="composer-heading">参与这场讨论</h2>
        <p className="composer-hint">登录并绑定 Bangumi 后，就可以分享你的想法。</p>
        <div>
          <Link className="button primary" href={'/login?redirect=' + encodeURIComponent(returnTo)}>
            登录后参与
          </Link>
        </div>
      </aside>
    )
  if (!isBound)
    return (
      <aside className="panel composer">
        <h2 className="composer-heading">还差一步，就能加入讨论</h2>
        <p className="composer-hint">发言需要绑定 Bangumi 账号。</p>
        <div>
          <Link className="button primary" href="/bind-bangumi">
            前往绑定账号
          </Link>
        </div>
      </aside>
    )

  return (
    <form id="reply-composer" className="panel composer" onSubmit={submit}>
      <h2 className="composer-heading">{isTopic ? '发起新话题' : '写下你的想法'}</h2>
      {replyTarget ? (
        <div className="composer-reply-context">
          正在回复 <strong>@{replyTarget.author}</strong>
          {replyTarget.floor ? ` · ${replyTarget.floor} 楼` : ''}
          <button type="button" onClick={() => setReplyTarget(null)} aria-label="取消回复对象">
            取消
          </button>
        </div>
      ) : null}
      {isTopic ? (
        <input
          aria-label="话题标题"
          disabled={busy}
          required
          className="bangmio-input"
          value={title}
          onChange={event => setTitle(event.target.value)}
          placeholder="话题标题"
          maxLength={120}
        />
      ) : null}
      <div className="composer-toolbar">
        <button
          className="composer-tab"
          type="button"
          aria-pressed={!preview}
          onClick={() => setPreview(false)}
        >
          编辑
        </button>
        <button
          className="composer-tab"
          type="button"
          aria-pressed={preview}
          onClick={() => setPreview(true)}
        >
          预览
        </button>
        <span className="composer-draft-note">草稿自动保存在本设备</span>
      </div>
      {preview ? (
        <div className="composer-preview" aria-label="正文预览">
          {content.trim() ? <RichText value={content} /> : <span>还没有内容可预览。</span>}
        </div>
      ) : null}
      {!preview ? (
        <textarea
          aria-label="正文"
          disabled={busy}
          className="bangmio-input"
          value={content}
          onChange={event => setContent(event.target.value)}
          placeholder={mode === 'reply' || mode === 'group-reply' ? '写下回复…' : '分享你的想法…'}
          rows={4}
          maxLength={20000}
          required
          onKeyDown={event => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
              event.preventDefault()
              event.currentTarget.form?.requestSubmit()
            }
          }}
        />
      ) : null}
      <div className="composer-footer">
        <span role="status">{message || '友善交流，涉及剧透请提前提醒。'}</span>
        <small
          className="composer-counter"
          aria-label={`正文长度 ${content.length.toLocaleString()} / 20,000`}
        >
          {content.length.toLocaleString()} / 20,000
        </small>
        <button className="button primary" type="submit" disabled={busy}>
          {busy ? '发布中…' : isTopic ? '发布话题' : '发布'}
        </button>
      </div>
    </form>
  )
}
