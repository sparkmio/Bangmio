'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import type { ApiResult } from '@/lib/types'

type Message = { role: 'user' | 'assistant'; content: string }

export function AiChat({ context }: { context?: string }) {
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

  return <>
    {open ? <section className="fixed bottom-20 right-4 z-[60] flex h-[min(36rem,calc(100vh-6rem))] w-[min(25rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-2xl md:bottom-6 md:right-6">
      <header className="flex items-center justify-between border-b border-base-300 px-4 py-3">
        <div><h2 className="font-semibold">Bangmio AI</h2><p className="text-xs text-base-content/45">聊番剧、角色与条目资料</p></div>
        <button className="btn btn-ghost btn-sm btn-circle" type="button" onClick={() => setOpen(false)} aria-label="关闭 AI 对话">×</button>
      </header>
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length ? messages.map((message, index) => <div key={`${message.role}-${index}`} className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-6 ${message.role === 'user' ? 'ml-auto bg-primary text-primary-content' : 'bg-base-200 text-base-content'}`}>{message.content}</div>) : <p className="rounded-xl bg-base-200/60 p-3 text-sm leading-6 text-base-content/65">你好！可以问我这部作品的设定、人物关系、观看建议，或让我们一起整理资料。</p>}
        {busy ? <div className="w-fit rounded-2xl bg-base-200 px-3 py-2 text-sm text-base-content/55">正在思考…</div> : null}
      </div>
      <form className="border-t border-base-300 p-3" onSubmit={submit}>
        {error ? <p className="mb-2 text-xs text-error">{error}</p> : null}
        <div className="flex gap-2"><textarea className="textarea textarea-bordered min-h-0 flex-1 resize-none" rows={2} value={input} maxLength={2000} onChange={event => setInput(event.target.value)} placeholder="问点什么…" /><button className="btn btn-primary self-end" type="submit" disabled={busy || !input.trim()}>发送</button></div>
      </form>
    </section> : null}
    <button className="btn btn-primary btn-circle fixed bottom-20 right-4 z-[60] shadow-lg shadow-primary/30 md:bottom-6 md:right-6" type="button" onClick={() => setOpen(value => !value)} aria-label="打开 AI 对话" title="Bangmio AI">
      <span className="text-lg" aria-hidden="true">✦</span>
    </button>
  </>
}
