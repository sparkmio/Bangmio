import type { Metadata } from 'next'
import { Providers } from '@/components/providers'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Bangmio · 你的番组空间', template: '%s · Bangmio' },
  description: '发现番组、管理收藏、记录自己的观看轨迹。'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><Providers>{children}</Providers></body></html>
}
