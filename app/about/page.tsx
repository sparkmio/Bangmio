import type { Metadata } from 'next'
import { Suspense } from 'react'
import AboutContent from './about-content'

export const metadata: Metadata = {
  title: '关于我们',
  description: '了解 Bangmio 项目、数据来源、隐私和联系渠道。'
}

export default function AboutPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto py-8 text-sm text-base-content/50">正在加载…</div>
      }
    >
      <AboutContent />
    </Suspense>
  )
}
