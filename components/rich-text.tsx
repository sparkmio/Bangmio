import type { ReactNode } from 'react'

const LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>"'\u3000]+)/gi
const TRAILING_PUNCTUATION = /[.,!?;:，。！？；：、）》】』」』]+$/

function lineParts(line: string): ReactNode[] {
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = LINK_RE.exec(line))) {
    if (match.index > lastIndex) parts.push(<span key={`text-${lastIndex}`}>{line.slice(lastIndex, match.index)}</span>)
    const label = match[1] || match[3]
    const rawHref = match[2] || match[3]
    const trailing = rawHref.match(TRAILING_PUNCTUATION)?.[0] || ''
    const href = trailing ? rawHref.slice(0, -trailing.length) : rawHref
    parts.push(<span key={`link-${match.index}`}><a href={href} target="_blank" rel="noopener noreferrer" className="text-link break-all">{label}</a>{trailing}</span>)
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < line.length) parts.push(<span key={`text-${lastIndex}`}>{line.slice(lastIndex)}</span>)
  return parts.length ? parts : [<span key="text-empty">{line}</span>]
}

export function RichText({ value, fallback = '暂无内容。' }: { value?: unknown; fallback?: string }) {
  const text = typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  const content = text.trim() || fallback
  return <div className="rich-text">{content.split(/\r?\n/).map((line, index) => <p key={index}>{lineParts(line)}</p>)}</div>
}
