import { Suspense } from 'react'
import AboutContent from './about-content'

export default function AboutPage() {
  return <Suspense fallback={<div className="max-w-2xl mx-auto py-8 text-sm text-base-content/50">正在加载…</div>}><AboutContent /></Suspense>
}
