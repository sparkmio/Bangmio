'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

/** An upstream failure is not an empty list. Refresh only performs page reads. */
export function DataUnavailable({ label }: { label: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <div className="panel empty-state compact-empty" role="alert" aria-busy={pending}>
      <h3>{label}加载失败</h3>
      <p>暂时无法获取数据，不代表没有内容。</p>
      <button
        className="button ghost"
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => router.refresh())}
      >
        {pending ? '重试中…' : '重试加载'}
      </button>
    </div>
  )
}
