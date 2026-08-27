'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { avatarUrl } from '@/lib/api'
import { useAuth } from './auth-provider'

type IconName = 'home' | 'trending' | 'browse' | 'groups' | 'about' | 'settings' | 'moon' | 'sun' | 'user'

type NavItem = { href: string; label: string; icon: IconName }

const navItems: NavItem[] = [
  { href: '/', label: '首页', icon: 'home' },
  { href: '/trending', label: '新番时间表', icon: 'trending' },
  { href: '/anime', label: '搜索', icon: 'browse' },
  { href: '/groups', label: '小组', icon: 'groups' },
  { href: '/about', label: '关于我们', icon: 'about' },
  { href: '/settings', label: '设置', icon: 'settings' }
]

const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/bind-bangumi']

function Icon({ name, className = 'w-5 h-5' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    home: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0 7-7 7 7M5 10v10a1 1 0 0 0 1 1h3m10-11 2 2m-2-2v10a1 1 0 0 1-1 1h-3m-6 0a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1m-6 0h6" />,
    trending: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8-8 8-4-4-6 6" />,
    browse: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10" />,
    groups: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm6 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />,
    about: <><circle cx="12" cy="12" r="9" strokeWidth="2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11v5m0-8h.01" /></>,
    settings: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065Z" />,
    moon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 0 1 8.646 3.646 9.003 9.003 0 0 0 12 21a9.003 9.003 0 0 0 8.354-5.646Z" />,
    sun: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364-.707-.707M6.343 6.343l-.707-.707m12.728 0-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />,
    user: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z" />
  }
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href
}

function ProfileAvatar({ size = 'w-8 h-8' }: { size?: string }) {
  const { user } = useAuth()
  const name = user?.nickname || user?.username || 'B'
  const avatar = avatarUrl(user || undefined)
  return <div className="avatar"><div className={`${size} rounded-full ring-2 ring-primary/20`}>
    {avatar ? <img src={avatar} alt={name} className="rounded-full" decoding="async" /> : <div className={`${size} rounded-full bg-primary text-primary-content flex items-center justify-center text-sm font-bold`}>{name.slice(0, 1).toUpperCase()}</div>}
  </div></div>
}

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { isAuthenticated, isBangmioUser, isBound, user, logout, setShowBindModal } = useAuth()
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const protectedRoute = pathname === '/watching' || pathname === '/profile' || pathname === '/settings' || pathname.startsWith('/profile/')
    if (protectedRoute && isAuthenticated && isBangmioUser && !isBound) setShowBindModal(true)
  }, [isAuthenticated, isBangmioUser, isBound, pathname, setShowBindModal])

  useEffect(() => {
    const saved = window.localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'
    setTheme(saved)
    document.documentElement.dataset.theme = saved
    document.documentElement.classList.toggle('dark', saved === 'dark')
    document.documentElement.classList.toggle('light', saved === 'light')
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.dataset.theme = next
    document.documentElement.classList.toggle('dark', next === 'dark')
    document.documentElement.classList.toggle('light', next === 'light')
    window.localStorage.setItem('theme', next)
  }

  if (authRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
    return <div className="bm-auth-root">{children}</div>
  }

  const accountName = user?.nickname || user?.username || 'Bangmio 用户'

  return <div className="min-h-screen bg-base-100">
    <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-56 z-40 bg-base-100/40 backdrop-blur-xl border-r border-base-300/30">
      <div className="flex items-center gap-3 px-5 h-16 border-b border-base-300/30 shrink-0">
        <Link href="/" className="flex items-center gap-3"><img src="/logo.png" alt="Bangmio" className="w-8 h-8 rounded-xl ring-2 ring-primary/20" decoding="async" /><span className="text-lg font-bold tracking-tight text-primary">Bangmio</span></Link>
      </div>
      <ul className="menu flex-1 py-4 px-3 gap-1">
        {navItems.map(item => <li key={item.href}><Link href={item.href} className={`gap-3 rounded-lg ${isActive(pathname, item.href) ? 'active' : ''}`}><Icon name={item.icon} /><span className="font-medium">{item.label}</span></Link></li>)}
      </ul>
      <div className="px-3 py-4 border-t border-base-300/30 shrink-0">
        {isAuthenticated ? <>
          <Link href="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"><ProfileAvatar /><div className="min-w-0 flex-1"><p className="text-sm font-medium truncate text-base-content">{accountName}</p><p className="text-xs truncate text-base-content/40">查看主页</p></div></Link>
          <button className="btn btn-ghost btn-xs w-full mt-2 text-base-content/40 hover:text-error rounded-full" type="button" onClick={logout}>退出登录</button>
        </> : <Link href="/login" className="btn btn-primary btn-sm w-full rounded-full shadow-lg shadow-primary/20">登录 Bangmio</Link>}
        <button className="btn btn-ghost btn-xs w-full mt-3 gap-2 rounded-full" type="button" onClick={toggleTheme}><Icon name={theme === 'dark' ? 'sun' : 'moon'} className="w-4 h-4" />{theme === 'dark' ? '浅色模式' : '深色模式'}</button>
      </div>
    </aside>

<div className="md:hidden sticky top-0 z-50 navbar bg-base-100/60 backdrop-blur-xl border-b border-base-300/50">
      <div className="navbar-start">
        <Link href="/" className="flex items-center gap-2"><img src="/logo.png" alt="Bangmio" className="w-7 h-7 rounded-lg" decoding="async" /><span className="text-lg font-black text-primary">Bangmio</span></Link>
      </div>
      <div className="navbar-end gap-1">
        <button className="btn btn-ghost btn-sm btn-circle" type="button" onClick={toggleTheme} aria-label="切换主题"><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
        {isAuthenticated ? <Link href="/profile" className="btn btn-ghost btn-sm btn-circle"><ProfileAvatar size="w-7 h-7" /></Link> : <Link href="/login" className="btn btn-primary btn-sm rounded-full">登录</Link>}
      </div>
    </div>


    <div className="md:ml-56 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0 min-h-screen flex flex-col">
      <main className="flex-1 w-full px-4 py-4 sm:px-5 sm:py-6 md:px-8">{children}</main>
    </div>

    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 btm-nav bg-base-100/60 backdrop-blur-xl border-t border-base-300/50 min-h-[3.5rem]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {([
        ['/', '首页', 'home'], ['/anime', '搜索', 'browse'], ['/groups', '小组', 'groups'], ['/settings', '设置', 'settings'], ['/profile', isAuthenticated ? '我的' : '登录', 'user']
      ] as Array<[string, string, IconName]>).map(([href, label, icon]) => <Link key={href} href={href} className={`min-h-[44px] ${isActive(pathname, href) ? 'active text-primary' : 'text-base-content/40'}`}><Icon name={icon} /><span className="btm-nav-label text-xs">{label}</span></Link>)}
    </nav>
  </div>
}
