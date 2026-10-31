import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = { title: '新番时间表' }

export default function TrendingLayout({ children }: { children: ReactNode }) {
  return children
}
