'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import type { ApiResult } from '@/lib/types'

type Message = { role: 'user' | 'assistant'; content: string }

export function AiChat({ context }: { context?: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, open])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const content = input.trim()
    if (!content || busy) return
    const nextMessages = [...messages, { role: 'user' as const, content }].slice(-12)
    setMessages(nextMessages)
    setInput('')
    setError('')
    setBusy(true)
    try {
      const response = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, context })
      })
      const payload = await response.json().catch(() => ({})) as ApiResult<{ message?: string }>
      if (!response.ok || !payload.data?.message) throw new Error(payload.error || 'AI 回复失败')
      setMessages(current => [...current, { role: 'assistant' as const, content: payload.data?.message || '' }].slice(-12))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'AI 服务暂时不可用')
    } finally {
      setBusy(false)
    }
  }

  const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/bind-bangumi']
  if (authRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`))) return null

  return <>
    {open ? <section className="bm-ai-panel" role="dialog" aria-label="Bangmio AI 对话">
      <header className="bm-ai-header">
        <div><h2>Bangmio AI</h2><p>聊番剧、角色与条目资料</p></div>
        <button type="button" onClick={() => setOpen(false)} aria-label="关闭 AI 对话">×</button>
      </header>
      <div ref={scrollRef} className="bm-ai-messages">
        {messages.length ? messages.map((message, index) => <div key={`${message.role}-${index}`} className={`bm-ai-message ${message.role === 'user' ? 'is-user' : 'is-assistant'}`}>{message.content}</div>) : <p className="bm-ai-welcome">你好！可以问我这部作品的设定、人物关系、观看建议，或让我们一起整理资料。</p>}
        {busy ? <div className="bm-ai-message is-assistant">正在思考…</div> : null}
      </div>
      <form className="bm-ai-form" onSubmit={submit}>
        {error ? <p className="bm-ai-error">{error}</p> : null}
        <div><textarea rows={2} value={input} maxLength={2000} onChange={event => setInput(event.target.value)} placeholder="问点什么…" /><button type="submit" disabled={busy || !input.trim()}>发送</button></div>
      </form>
    </section> : null}
    {!open ? <button className="bm-ai-launcher" type="button" onClick={() => setOpen(true)} aria-label="打开 AI 助手" title="Bangmio AI 助手"><span aria-hidden="true">✦</span><strong>AI 助手</strong></button> : null}
  </>
}
