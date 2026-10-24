'use client'

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

      {/* 主内容区 */}
      <div className="mb-24 md:ml-28 md:mb-0 transition-all duration-300">
        <main className="max-w-[1200px] mx-auto px-4 py-4 md:px-8 md:py-6">{children}</main>
      </div>
    </div>
  )
}
