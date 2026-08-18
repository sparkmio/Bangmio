'use client'

import { useEffect, useState } from 'react'
import { AnimeGrid } from '@/components/anime-card'
import { SectionHeading } from '@/components/ui'
import type { Subject } from '@/lib/types'

export default function AnimeBrowsePage() {
  const [keyword, setKeyword] = useState('')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function search(event?: React.FormEvent) {
    event?.preventDefault()
    if (!keyword.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const response = await fetch(`/api/v1/anime/search?q=${encodeURIComponent(keyword.trim())}&limit=30`)
      const payload = await response.json()
      setSubjects(Array.isArray(payload.data) ? payload.data : [])
    } catch {
      setSubjects([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { document.title = '找番 · Bangmio' }, [])
  return <><SectionHeading eyebrow="Discover" title="找一部番" description="输入作品名、原名或关键词，开始你的下一次发现。" /><form className="toolbar" onSubmit={search}><input className="bangmio-input" value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="搜索动画、角色或关键词…" /><button className="button primary" type="submit" disabled={loading}>{loading ? '搜索中…' : '搜索'}</button></form>{searched ? <AnimeGrid subjects={subjects} empty="没有找到相关作品" /> : <div className="panel empty-state"><div className="empty-icon">⌕</div><h3>从一个关键词开始</h3><p>可以试试作品名、制作公司或者角色名。</p></div>}</>
}
