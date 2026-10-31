'use client'

import { usePathname } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { useAuth } from './auth-provider'
import { DockNavigation } from './dock-navigation'
import { AnnouncementPopup } from './announcement-popup'

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
    return (
      <>
        <div className="bm-auth-root">{children}</div>
        <AnnouncementPopup />
      </>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bm-bg)' }}>
      {/* Dock 导航 */}
      <DockNavigation />
      <AnnouncementPopup />

      {/* 主内容区：与 Dock 的间距在 globals.css 的 .bm-shell-content 里定义
          （编译好的工具类样式表没有 lg: 变体，写在这里才能保证生效） */}
      <div className="bm-shell-content transition-all duration-300">
        <main className="max-w-[1200px] mx-auto px-4 py-4 md:px-8 md:py-6">{children}</main>
      </div>
    </div>
  )
}
