'use client'

import { createElement, FormEvent, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import type { ApiResult } from '@/lib/types'
import { RichText } from './rich-text'

type Message = { role: 'user' | 'assistant'; content: string }
type Conversation = { id: string; title: string; messages: Message[]; updatedAt: number }

const STORAGE_KEY = 'bangmio-ai-conversations-v1'
const OPENING: Message = { role: 'assistant', content: '你好，我是澪，Bangmio 的番剧资料助手。\n\n我可以结合你当前正在浏览的页面，帮你梳理剧情、角色、制作信息、音乐和观看顺序。你也可以直接问我：“这页最值得关注的是什么？”' }
const DEFAULT_SUGGESTIONS = ['用当前页面内容概括这部作品', '介绍页面里的主要角色和关系', '找出这部作品的音乐与演唱者', '这部作品适合什么顺序观看？']

function readConversations(): Conversation[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value.filter(item => item && Array.isArray(item.messages)) : []
  } catch { return [] }
}

function saveConversations(items: Conversation[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 20)))
}

function createConversationId() {
  const webCrypto = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined
  if (webCrypto?.randomUUID) return webCrypto.randomUUID()
  if (webCrypto) return `${Date.now()}-${Array.from(webCrypto.getRandomValues(new Uint32Array(2))).join('-')}`
  return `conversation-${Date.now()}`
}

function isOpening(message: Message) {
  return message.role === OPENING.role && message.content === OPENING.content
}

function pageContext(extra?: string) {
  if (typeof document === 'undefined') return extra || ''
  const root = document.querySelector('main') || document.body
  const clone = root.cloneNode(true) as HTMLElement
  clone.querySelectorAll('input, textarea, select, button, script, style, nav, [aria-hidden="true"]').forEach(node => node.remove())
  const text = (clone.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 6000)
  return [`页面标题：${document.title}`, `地址：${window.location.pathname}`, extra ? `条目资料：${extra}` : '', `页面可见内容：${text}`].filter(Boolean).join('\n')
}

function inlineMarkdown(value: string): ReactNode[] {
  const tokens: ReactNode[] = []
  const pattern = /(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<]+|`[^`]+`|~~[^~]+~~|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g
  let last = 0
  for (const match of value.matchAll(pattern)) {
    const index = match.index || 0
    if (index > last) tokens.push(value.slice(last, index))
    const token = match[0]
    if (token.startsWith('[')) {
      const parsed = token.match(/^\[([^\]]+)\]\(([^\s\)]+)\)$/)
      if (parsed && /^https?:\/\//i.test(parsed[2])) tokens.push(<a key={`${index}-link`} href={parsed[2]} target="_blank" rel="noopener noreferrer">{parsed[1]}</a>)
      else tokens.push(token)
    } else if (/^https?:\/\//i.test(token)) {
      const href = token.replace(/[.,!?;:]+$/, '')
      tokens.push(<a key={`${index}-url`} href={href} target="_blank" rel="noopener noreferrer">{token}</a>)
    } else if (token.startsWith('`')) tokens.push(<code key={`${index}-code`}>{token.slice(1, -1)}</code>)
    else if (token.startsWith('~~')) tokens.push(<del key={`${index}-del`}>{token.slice(2, -2)}</del>)
    else if (token.startsWith('**') || token.startsWith('__')) tokens.push(<strong key={`${index}-strong`}>{token.slice(2, -2)}</strong>)
    else tokens.push(<em key={`${index}-em`}>{token.slice(1, -1)}</em>)
    last = index + token.length
  }
  if (last < value.length) tokens.push(value.slice(last))
  return tokens
}

function MarkdownMessage({ content }: { content: string }) {
  const lines = content.replace(/\r/g, '').split('\n')
  const blocks: ReactNode[] = []
  let list: string[] = []
  let ordered = false
  let code: string[] = []
  let inCode = false
  let quote: string[] = []
  const flushList = () => {
    if (!list.length) return
    const List = ordered ? 'ol' : 'ul'
    blocks.push(<List key={`list-${blocks.length}`}>{list.map((item, index) => <li key={index}>{inlineMarkdown(item)}</li>)}</List>)
    list = []
    ordered = false
  }
  const flushQuote = () => {
    if (!quote.length) return
    blocks.push(<blockquote key={`quote-${blocks.length}`}>{quote.map((item, index) => <p key={index}>{inlineMarkdown(item)}</p>)}</blockquote>)
    quote = []
  }
  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('```')) {
      flushList(); flushQuote()
      if (inCode) { blocks.push(<pre key={'code-' + index}><code>{code.join('\n')}</code></pre>); code = [] }
      inCode = !inCode
      return
    }
    if (inCode) { code.push(line); return }
    const quoteLine = trimmed.match(/^>\s?(.*)$/)
    if (quoteLine) { flushList(); quote.push(quoteLine[1]); return }
    const item = trimmed.match(/^(?:(-)|(?:\d+[.)]))\s+(.+)$/)
    if (item) {
      flushQuote()
      const nextOrdered = !item[1]
      if (list.length && ordered !== nextOrdered) flushList()
      ordered = nextOrdered
      list.push(item[2])
      return
    }
    flushList(); flushQuote()
    if (!trimmed) return
    if (/^(?:---+|___+|\*\*\*+)$/.test(trimmed)) { blocks.push(<hr key={`rule-${index}`} />); return }
    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      const level = Math.min(6, heading[1].length)
      const headingTag = (`h${level}`) as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
      blocks.push(createElement(headingTag, { key: `heading-${index}` }, inlineMarkdown(heading[2])))
    } else blocks.push(<p key={'paragraph-' + index}>{inlineMarkdown(trimmed)}</p>)
  })
  flushList(); flushQuote()
  if (code.length) blocks.push(<pre key={'code-' + blocks.length}><code>{code.join('\n')}</code></pre>)
  return <div className="bm-ai-markdown">{blocks}</div>
}

export function AiChat({ context }: { context?: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationId, setConversationId] = useState('')
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTIONS)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const active = conversations.find(item => item.id === conversationId)
  const messages = active?.messages || [OPENING]
  const currentContext = useMemo(() => pageContext(context), [context, pathname])

  useEffect(() => {
    const saved = readConversations()
    setConversations(saved)
    setConversationId(saved[0]?.id || '')
  }, [])

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open, busy])

  useEffect(() => {
    if (!open) return
    let alive = true
    fetch('/api/v1/ai/suggestions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ context: currentContext }) })
      .then(response => response.json().catch(() => ({})) as Promise<ApiResult<{ suggestions?: string[] }>>)
      .then(payload => { if (alive && Array.isArray(payload.data?.suggestions) && payload.data.suggestions.length) setSuggestions(payload.data.suggestions) })
      .catch(() => undefined)
    return () => { alive = false }
  }, [open, currentContext])

  const createConversation = useCallback(() => {
    const next: Conversation = { id: createConversationId(), title: '新对话', messages: [OPENING], updatedAt: Date.now() }
    setConversations(items => { const updated = [next, ...items.filter(item => item.id !== next.id)]; saveConversations(updated); return updated })
    setConversationId(next.id); setHistoryOpen(false); setError('')
  }, [])

  function ensureConversation() {
    if (conversationId && active) return active
    const next: Conversation = { id: createConversationId(), title: '新对话', messages: [OPENING], updatedAt: Date.now() }
    setConversationId(next.id)
    setConversations(items => { const updated = [next, ...items]; saveConversations(updated); return updated })
    return next
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const content = input.trim()
    if (!content || busy) return
    const conversation = ensureConversation()
    const nextMessages = [...conversation.messages.filter(message => !isOpening(message)), { role: 'user' as const, content }].slice(-12)
    const optimistic = { ...conversation, title: conversation.title === '新对话' ? content.slice(0, 24) : conversation.title, messages: nextMessages, updatedAt: Date.now() }
    setConversations(items => { const updated = [optimistic, ...items.filter(item => item.id !== conversation.id)]; saveConversations(updated); return updated })
    setInput(''); setError(''); setBusy(true)
    try {
      const response = await fetch('/api/v1/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: nextMessages, context: currentContext }) })
      const payload = await response.json().catch(() => ({})) as ApiResult<{ message?: string }>
      if (!response.ok || !payload.data?.message) throw new Error(payload.error || 'AI 回复失败')
      const completed = { ...optimistic, messages: [...nextMessages, { role: 'assistant' as const, content: payload.data.message }].slice(-12), updatedAt: Date.now() }
      setConversations(items => { const updated = [completed, ...items.filter(item => item.id !== conversation.id)]; saveConversations(updated); return updated })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'AI 服务暂时不可用') }
    finally { setBusy(false) }
  }

  const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/bind-bangumi']
  if (authRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`))) return null

  return <>
    {open ? <section className="bm-ai-panel" role="dialog" aria-label="Bangmio AI 对话">
      <header className="bm-ai-header"><div><h2>Bangmio AI</h2><p>澪 · 当前页面资料助手</p></div><div className="bm-ai-header-actions"><button type="button" onClick={() => setHistoryOpen(value => !value)} aria-label="查看历史对话">历史</button><button type="button" onClick={createConversation} aria-label="新建对话">新建</button><button type="button" onClick={() => setOpen(false)} aria-label="关闭 AI 对话">×</button></div></header>
      {historyOpen ? <aside className="bm-ai-history"><div className="bm-ai-history-title">历史对话</div>{conversations.length ? conversations.map(item => <button type="button" key={item.id} className={item.id === conversationId ? 'is-active' : ''} onClick={() => { setConversationId(item.id); setHistoryOpen(false) }}>{item.title}</button>) : <p>还没有已保存的对话</p>}</aside> : null}
      <div ref={scrollRef} className="bm-ai-messages">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`bm-ai-message ${message.role === 'user' ? 'is-user' : 'is-assistant'}`}>{message.role === 'assistant' ? <MarkdownMessage content={message.content} /> : <RichText value={message.content} fallback="" />}</div>)}{busy ? <div className="bm-ai-message is-assistant"><p>正在思考…</p></div> : null}</div>
      <div className="bm-ai-suggestions">{suggestions.slice(0, 4).map(item => <button type="button" key={item} onClick={() => setInput(item)}>{item}</button>)}</div>
      <form className="bm-ai-form" onSubmit={submit}>{error ? <p className="bm-ai-error">{error}</p> : null}<div><textarea rows={2} value={input} maxLength={2000} onChange={event => setInput(event.target.value)} placeholder="问点什么…" /><button type="submit" disabled={busy || !input.trim()}>发送</button></div></form>
    </section> : null}
    {!open ? <button className="bm-ai-launcher" type="button" onClick={() => setOpen(true)} aria-label="打开 AI 助手" title="Bangmio AI 助手"><span aria-hidden="true">✦</span><strong>AI 助手</strong></button> : null}
  </>
}
