'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { animeDetailRetryKey } from '@/lib/anime-detail-recovery'

export default function AnimeDetailError({ reset }: { error: Error; reset: () => void }) {
  const pathname = usePathname()
  const retried = useRef(false)
  const id = pathname.match(/^\/anime\/([1-9]\d*)/)?.[1]
  const retryKey = id ? animeDetailRetryKey(id) : ''
  const title = id ? `番剧 ${id} · Bangmio` : '番剧详情 · Bangmio'

  useEffect(() => {
    if (retried.current || !retryKey) return
    try {
      const lastRetry = Number(sessionStorage.getItem(retryKey))
      if (Number.isFinite(lastRetry) && Date.now() - lastRetry < 5 * 60 * 1000) return
      sessionStorage.setItem(retryKey, String(Date.now()))
    } catch {
      return
    }
    retried.current = true
    const timer = window.setTimeout(reset, 250)
    return () => window.clearTimeout(timer)
  }, [reset, retryKey])

  return (
    <main className="mx-auto max-w-xl py-16 text-center" aria-labelledby="anime-error-title">
      <title>{title}</title>
      <h1 id="anime-error-title" className="mb-3 text-xl font-semibold text-base-content">
        {id ? `番剧 ${id} 暂时无法加载` : '番剧详情暂时无法加载'}
      </h1>
      <p className="mb-6 text-sm text-base-content/60">
        页面正在自动恢复。如果仍然失败，可以手动重试。
      </p>
      <div className="flex justify-center gap-3">
        <button className="btn btn-primary btn-sm" type="button" onClick={reset}>
          再次加载
        </button>
        <Link className="btn btn-ghost btn-sm" href="/anime">
          返回浏览
        </Link>
      </div>
    </main>
  )
}
