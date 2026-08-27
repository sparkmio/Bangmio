'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimeGrid } from '@/components/anime-card'
import { VueLoadingState } from '@/components/vue-loading-state'
import type { Subject } from '@/lib/types'

type CalendarDay = { weekday?: { id?: number }; items?: Subject[] }
const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export default function TrendingPage() {
  const router = useRouter()
  const [activeDay, setActiveDay] = useState(new Date().getDay() || 7)
  const [weekData, setWeekData] = useState<CalendarDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const currentDayItems = useMemo(() => weekData.find(day => Number(day.weekday?.id) === activeDay)?.items || [], [activeDay, weekData])
  const fetchCalendar = async () => {
    setLoading(true); setError('')
    try { const response = await fetch('/api/v1/anime/calendar', { headers: { Accept: 'application/json' } }); const payload = await response.json(); if (!response.ok) throw new Error('加载失败'); setWeekData(Array.isArray(payload.data) ? payload.data : []) } catch { setError('加载失败') } finally { setLoading(false) }
  }
  useEffect(() => { void fetchCalendar() }, [])
  return <div><div className="flex items-center gap-3 mb-6"><button className="text-sm text-primary hover-underline-wipe cursor-pointer" type="button" onClick={() => router.back()}>← 返回</button><h1 className="text-2xl font-semibold text-base-content">新番时间表</h1></div><VueLoadingState loading={loading} error={error} onRetry={() => void fetchCalendar()} />{!loading && !error ? <><div className="flex gap-1.5 mb-6 overflow-x-auto scrollbar-hide pb-1">{dayLabels.map((day, index) => <button key={day} className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${activeDay === index + 1 ? 'bg-primary text-primary-content shadow-sm' : 'bg-base-200/60 text-base-content/60 hover:bg-base-200'}`} type="button" onClick={() => setActiveDay(index + 1)}>{day}</button>)}</div>{!currentDayItems.length ? <div className="py-10 text-center text-base-content/50">当天暂无番剧播出</div> : <AnimeGrid subjects={currentDayItems} />}</> : null}</div>
}