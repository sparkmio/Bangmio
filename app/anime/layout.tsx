import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = { title: '浏览番剧' }

export default function AnimeLayout({ children }: { children: ReactNode }) {
  return children
}
