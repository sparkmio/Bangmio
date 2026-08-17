'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { avatarUrl } from '@/lib/api'
import { useAuth } from './auth-provider'

type NavItem = { href: string; label: string; icon: React.ReactNode }

const icons = {
  home: <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
  calendar: <path d="M4 5h16v15H4zM8 3v4M16 3v4M4 9h16M8 14l2 2 5-5" />,
  search: <><path d="M21 21l-6-6" /><circle cx="10" cy="10" r="7" /></>,
  groups: <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />,
  about: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0015 19.4a1.7 1.7 0 00-1 .6 1.7 1.7 0 00-.4 1V21h-4v-.08a1.7 1.7 0 00-1.1-1.52 1.7 1.7 0 00-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 004.6 15c-.2-.36-.48-.7-.82-.92-.3-.2-.64-.32-1-.36H3v-4h.08A1.7 1.7 0 004.6 8.5a1.7 1.7 0 00-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 009 4.6a1.7 1.7 0 001-.6 1.7 1.7 0 00.4-1V3h4v.08A1.7 1.7 0 0015.5 4.6a1.7 1.7 0 001.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0019.4 9c.2.36.48.7.82.92.3.2.64.32 1 .36H21v4h-.08A1.7 1.7 0 0019.4 15Z" /></>
} as const

const navItems: NavItem[] = [
  { href: '/', label: '首页', icon: icons.home },
  { href: '/trending', label: '新番时间表', icon: icons.calendar },
  { href: '/anime', label: '搜索', icon: icons.search },
  { href: '/groups', label: '小组', icon: icons.groups },
  { href: '/about', label: '关于我们', icon: icons.about },
  { href: '/settings', label: '设置', icon: icons.settings }
]

function activePath(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
}

function ThemeToggle() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const saved = window.localStorage.getItem('theme')
    const isDark = saved === 'dark'
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light'
  }, [])
  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    document.documentElement.dataset.theme = next ? 'dark' : 'light'
    window.localStorage.setItem('theme', next ? 'dark' : 'light')
  }
  return <button className="btn btn-ghost btn-xs w-full mt-3 gap-2 rounded-full" onClick={toggle} type="button">{dark ? '☀ 浅色模式' : '☾ 深色模式'}</button>
}

function Avatar({ src, name, mobile = false }: { src: string; name: string; mobile?: boolean }) {
  const size = mobile ? 'w-7 h-7' : 'w-8 h-8'
  return <div className={`${size} rounded-full ring-2 ring-primary/20 overflow-hidden bg-primary text-primary-content flex items-center justify-center text-xs font-bold`}>{src ? <img src={src} alt={name} className="w-full h-full object-cover" decoding="async" /> : name.slice(0, 1).toUpperCase()}</div>
}

function MobileNav({ pathname, loggedIn }: { pathname: string; loggedIn: boolean }) {
  const items = [
    { href: '/', label: '首页', icon: icons.home },
    { href: '/anime', label: '搜索', icon: icons.search },
    { href: '/groups', label: '小组', icon: icons.groups },
    { href: '/settings', label: '设置', icon: icons.settings },
    { href: '/profile', label: loggedIn ? '我的' : '登录', icon: <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0114 0" /></> }
  ]
  return <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 btm-nav bg-base-100/60 backdrop-blur-xl border-t border-base-300/50 min-h-[3.5rem]">{items.map(item => <Link key={item.href} href={item.href} className={`${activePath(pathname, item.href) ? 'active text-primary' : 'text-base-content/40'} min-h-[44px]`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{item.icon}</svg><span className="btm-nav-label text-xs">{item.label}</span></Link>)}</div>
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, isAuthenticated, logout } = useAuth()
  const name = user?.nickname || user?.username || ''
  const avatar = avatarUrl(user || undefined)
  return <div className="min-h-screen bg-base-100">
    <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-56 z-40 bg-base-100/40 backdrop-blur-xl border-r border-base-300/30">
      <div className="flex items-center gap-3 px-5 h-16 border-b border-base-300/30 shrink-0"><Link href="/" className="flex items-center gap-3"><img src="/logo.png" alt="Bangmio" className="w-8 h-8 rounded-xl ring-2 ring-primary/20" decoding="async" /><span className="text-lg font-bold tracking-tight text-primary">Bangmio</span></Link></div>
      <ul className="menu flex-1 py-4 px-3 gap-1">{navItems.map(item => <li key={item.href}><Link href={item.href} className={`${activePath(pathname, item.href) ? 'active' : ''} gap-3 rounded-lg`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{item.icon}</svg><span className="font-medium">{item.label}</span></Link></li>)}</ul>
      <div className="px-3 py-4 border-t border-base-300/30 shrink-0">{isAuthenticated ? <><Link href="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"><Avatar src={avatar} name={name} /><div className="min-w-0 flex-1"><p className="text-sm font-medium truncate text-base-content">{name}</p><p className="text-xs truncate text-base-content/40">查看主页</p></div></Link><button className="btn btn-ghost btn-xs w-full mt-2 text-base-content/40 hover:text-error rounded-full" onClick={logout} type="button">退出登录</button></> : <Link href="/login" className="btn btn-primary btn-sm w-full rounded-full shadow-lg shadow-primary/20">登录 Bangmio</Link>}<ThemeToggle /></div>
    </aside>
    <div className="md:hidden sticky top-0 z-50 navbar bg-base-100/60 backdrop-blur-xl border-b border-base-300/50"><div className="navbar-start"><Link href="/" className="flex items-center gap-2"><img src="/logo.png" alt="Bangmio" className="w-7 h-7 rounded-lg" /><span className="text-lg font-black text-primary">Bangmio</span></Link></div><div className="navbar-end gap-1">{isAuthenticated ? <Link href="/profile" className="btn btn-ghost btn-sm btn-circle"><Avatar src={avatar} name={name} mobile /></Link> : <Link href="/login" className="btn btn-primary btn-sm rounded-full">登录</Link>}</div></div>
    <div className="md:ml-56 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0 min-h-screen flex flex-col"><main className="flex-1 w-full px-4 py-4 sm:px-5 sm:py-6 md:px-8">{children}</main></div>
    <MobileNav pathname={pathname} loggedIn={isAuthenticated} />
  </div>
}