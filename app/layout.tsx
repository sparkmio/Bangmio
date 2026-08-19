import type { Metadata } from 'next'
import { Providers } from '@/components/providers'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Bangmio', template: '%s · Bangmio' },
  description: 'Bangmio - 一站式追番社区，聚合 Bangumi、豆瓣、B站、萌娘百科多平台数据。'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN" data-theme="light"><body><Providers>{children}</Providers></body></html>
}
