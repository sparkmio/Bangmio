'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { useAuth } from './auth-provider'
import { DockNavigation } from './dock-navigation'

const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/bind-bangumi']

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { isAuthenticated, isBangmioUser, isBound, setShowBindModal } = useAuth()

  useEffect(() => {
    const protectedRoute =
      pathname === '/watching' || pathname === '/profile' || pathname === '/settings'
    if (protectedRoute && isAuthenticated && isBangmioUser && !isBound) setShowBindModal(true)
  }, [isAuthenticated, isBangmioUser, isBound, pathname, setShowBindModal])

  if (authRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
    return <div className="bm-auth-root">{children}</div>
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bm-bg)' }}>
      {/* 新的 Dock 导航 */}
      <DockNavigation />

      {/* 主内容区：左边距必须大于 Dock 的右边缘（left 20px + 宽度 80px），留足间隙避免遮挡正文 */}
      <div className="mb-24 md:ml-32 md:mb-0 transition-all duration-300">
        <main className="max-w-[1200px] mx-auto px-4 py-4 md:px-8 md:py-6">{children}</main>
        <footer className="max-w-[1200px] mx-auto px-4 md:px-8 pb-10 pt-2">
          <div className="border-t border-[var(--bm-line)] pt-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-xs text-[var(--bm-muted)]">
            <span>Bangmio · 发现、记录、分享你的番剧世界</span>
            <span>
              数据来源：
              <a
                href="https://bgm.tv"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                Bangumi 番组计划
              </a>
            </span>
            <span className="sm:ml-auto flex gap-4">
              <Link href="/privacy" className="underline underline-offset-2">
                隐私说明
              </Link>
              <Link href="/about" className="underline underline-offset-2">
                关于 / 反馈
              </Link>
            </span>
          </div>
        </footer>
      </div>
    </div>
  )
}
