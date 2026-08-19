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
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0015 19.4a1.7 1.7 0 00-1 .6 1.7 1.7 0 00-.4 1V21h-4v-.08a1.7 1.7 0 01-1.1-1.52 1.7 1.7 0 01-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 014.6 15c-.2-.36-.48-.7-.82-.92-.3-.2-.64-.32-1-.36H3v-4h.08A1.7 1.7 0 014.6 8.5a1.7 1.7 0 01-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 019 4.6a1.7 1.7 0 011-.6 1.7 1.7 0 01.4-1V3h4v.08A1.7 1.7 0 0115.5 4.6a1.7 1.7 0 011.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0119.4 9c.2.36.48.7.82.92.3.2.64.32 1 .36H21v4h-.08A1.7 1.7 0 0119.4 15Z" /></>
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

function Icon({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <svg className={`shell-icon ${className}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">{children}</svg>
}

function Avatar({ src, name }: { src: string; name: string }) {
  return <span className="shell-avatar">{src ? <img src={src} alt="" /> : name.slice(0, 1).toUpperCase()}</span>
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, isAuthenticated, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dark, setDark] = useState(false)
  const name = user?.nickname || user?.username || 'Bangmio 用户'
  const avatar = avatarUrl(user || undefined)

  useEffect(() => {
    const saved = window.localStorage.getItem('theme') === 'dark'
    setDark(saved)
    document.documentElement.classList.toggle('dark', saved)
    document.documentElement.dataset.theme = saved ? 'dark' : 'light'
  }, [])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    document.documentElement.dataset.theme = next ? 'dark' : 'light'
    window.localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return <div className={`site-shell ${dark ? 'dark' : ''}`}>
    <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
      <div className="brand-row">
        <Link className="brand" href="/" onClick={() => setMenuOpen(false)}><img src="/logo.png" alt="Bangmio" /><span>Bangmio</span></Link>
        <button className="icon-button mobile-only" onClick={() => setMenuOpen(false)} aria-label="关闭菜单" type="button">×</button>
      </div>
      <div className="side-label">发现你的番剧世界</div>
      <nav className="side-nav" aria-label="主导航">
        {navItems.map(item => <Link key={item.href} href={item.href} className={`nav-item ${activePath(pathname, item.href) ? 'active' : ''}`} onClick={() => setMenuOpen(false)}><Icon>{item.icon}</Icon><span>{item.label}</span>{activePath(pathname, item.href) ? <span className="nav-dot" /> : null}</Link>)}
      </nav>
      <div className="side-bottom">
        {isAuthenticated ? <>
          <Link href="/profile" className="login-card"><Avatar src={avatar} name={name} /><div><strong>{name}</strong><span>查看我的追番记录</span></div><span className="login-arrow">›</span></Link>
          <button className="sidebar-logout" onClick={logout} type="button">退出登录</button>
        </> : <Link href="/login" className="login-card"><span className="login-icon">✦</span><div><strong>登录 Bangmio</strong><span>同步你的追番进度</span></div><span className="login-arrow">›</span></Link>}
        <button className="theme-button" onClick={toggleTheme} type="button"><span>{dark ? '☀' : '☾'}</span>{dark ? '浅色模式' : '深色模式'}</button>
      </div>
    </aside>

    <header className="mobile-header">
      <button className="icon-button" onClick={() => setMenuOpen(true)} aria-label="打开菜单" type="button">☰</button>
      <Link className="brand" href="/"><img src="/logo.png" alt="Bangmio" /><span>Bangmio</span></Link>
      <button className="icon-button" onClick={toggleTheme} aria-label="切换主题" type="button">{dark ? '☀' : '☾'}</button>
    </header>

    <main className="main-content">{children}</main>

    <nav className="mobile-bottom" aria-label="移动端导航">
      {[{ href: '/', label: '首页', icon: icons.home }, { href: '/anime', label: '搜索', icon: icons.search }, { href: '/groups', label: '小组', icon: icons.groups }, { href: isAuthenticated ? '/profile' : '/login', label: isAuthenticated ? '我的' : '登录', icon: <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0114 0" /></> }].map(item => <Link key={item.href} href={item.href} className={activePath(pathname, item.href) ? 'active' : ''}><Icon>{item.icon}</Icon><span>{item.label}</span></Link>)}
    </nav>
  </div>
}
