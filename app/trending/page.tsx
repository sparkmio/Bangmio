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
  const todayId = new Date().getDay() || 7
  const [activeDay, setActiveDay] = useState(todayId)
  const [weekData, setWeekData] = useState<CalendarDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const currentDayItems = useMemo(
    () => weekData.find(day => Number(day.weekday?.id) === activeDay)?.items || [],
    [activeDay, weekData]
  )
  const fetchCalendar = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/v1/anime/calendar', {
        headers: { Accept: 'application/json' }
      })
      const payload = await response.json()
      if (!response.ok) throw new Error('加载失败')
      setWeekData(Array.isArray(payload.data) ? payload.data : [])
    } catch {
      setError('加载失败')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void fetchCalendar()
  }, [])
  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <button
          className="cursor-pointer text-sm text-primary hover-underline-wipe"
          type="button"
          onClick={() => router.back()}
        >
          ← 返回
        </button>
        <h1 className="text-2xl font-semibold text-base-content">新番时间表</h1>
      </div>
      <p className="-mt-3 mb-6 text-sm text-base-content/50">
        按播出星期分组展示本周新番；Bangumi 日历不提供具体播出时刻，具体开播时间请以各播出平台为准。
      </p>
      <VueLoadingState
        loading={loading}
        loadingMessage="正在读取 Bangumi 本周放送数据…"
        error={error}
        onRetry={() => void fetchCalendar()}
      />
      {!loading && !error ? (
        <>
          <div className="mb-6 flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {dayLabels.map((day, index) => (
              <button
                key={day}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-300 ${activeDay === index + 1 ? 'bg-primary text-primary-content shadow-sm' : 'bg-base-200/60 text-base-content/60 hover:bg-base-200'}`}
                type="button"
                onClick={() => setActiveDay(index + 1)}
              >
                {day}
                {index + 1 === todayId ? ' · 今天' : ''}
              </button>
            ))}
          </div>
          {!currentDayItems.length ? (
            <div className="py-10 text-center text-base-content/50">当天暂无番剧播出</div>
          ) : (
            <>
              <p className="mb-4 text-sm text-base-content/50">
                {dayLabels[activeDay - 1]}共 {currentDayItems.length} 部
              </p>
              <AnimeGrid subjects={currentDayItems} />
            </>
          )}
        </>
      ) : null}
    </div>
  )
}
