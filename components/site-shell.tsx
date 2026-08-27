'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { avatarUrl } from '@/lib/api'
import { useAuth } from './auth-provider'

type IconName = 'home' | 'trending' | 'browse' | 'groups' | 'about' | 'settings' | 'moon' | 'sun' | 'user' | 'login' | 'close' | 'menu'
type NavItem = { href: string; label: string; detail: string; icon: IconName }

const navItems: NavItem[] = [
  { href: '/', label: '首页', detail: '发现热门内容', icon: 'home' },
  { href: '/trending', label: '新番时间表', detail: '本季播出安排', icon: 'trending' },
  { href: '/anime', label: '搜索', detail: '查找番剧资料', icon: 'browse' },
  { href: '/groups', label: '小组', detail: '和同好交流', icon: 'groups' },
  { href: '/about', label: '关于我们', detail: '了解 Bangmio', icon: 'about' },
  { href: '/settings', label: '设置', detail: '账号与偏好', icon: 'settings' }
]

const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/bind-bangumi']

function Icon({ name, className = 'bm-icon' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    home: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m3.5 11 8.5-7 8.5 7v8.5a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-5v6H5a1.5 1.5 0 0 1-1.5-1.5V11Z" />,
    trending: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 19V9m5 10V5m5 14v-7m5 7V3" /><path strokeLinecap="round" strokeWidth="1.8" d="M2.5 21h19" /></>,
    browse: <><circle cx="10.5" cy="10.5" r="6.5" strokeWidth="1.8" /><path strokeLinecap="round" strokeWidth="1.8" d="m15.5 15.5 5 5" /></>,
    groups: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15.5 20v-1.5a4 4 0 0 0-4-4h-5a4 4 0 0 0-4 4V20" /><circle cx="9" cy="7" r="3.5" strokeWidth="1.8" /><path strokeLinecap="round" strokeWidth="1.8" d="M16 4.2a3.5 3.5 0 0 1 0 6.6m5.5 9.2v-1.5a4 4 0 0 0-3-3.86" /></>,
    about: <><circle cx="12" cy="12" r="9" strokeWidth="1.8" /><path strokeLinecap="round" strokeWidth="1.8" d="M12 11v5m0-8h.01" /></>,
    settings: <><circle cx="12" cy="12" r="3" strokeWidth="1.8" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.5 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.5 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.16.37.37.7.6 1 .3.34.7.5 1.1.5h.1v4h-.1a1.7 1.7 0 0 0-1.7.5Z" /></>,
    moon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M20.5 15.2A8.7 8.7 0 0 1 8.8 3.5 8.7 8.7 0 1 0 20.5 15.2Z" />,
    sun: <><circle cx="12" cy="12" r="4" strokeWidth="1.8" /><path strokeLinecap="round" strokeWidth="1.8" d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
    user: <><circle cx="12" cy="8" r="4" strokeWidth="1.8" /><path strokeLinecap="round" strokeWidth="1.8" d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
    login: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M14 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-3" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m10 12 9-0m-3-3 3 3-3 3" /></>,
    close: <path strokeLinecap="round" strokeWidth="2" d="m6 6 12 12M18 6 6 18" />,
    menu: <path strokeLinecap="round" strokeWidth="2" d="M4 7h16M4 12h16M4 17h16" />
  }
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
}

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { isAuthenticated, user, logout } = useAuth()
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const saved = window.localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'
    setTheme(saved)
    document.documentElement.dataset.theme = saved
    document.documentElement.classList.toggle('dark', saved === 'dark')
  }, [])

  useEffect(() => setMenuOpen(false), [pathname])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.dataset.theme = next
    document.documentElement.classList.toggle('dark', next === 'dark')
    window.localStorage.setItem('theme', next)
  }

  if (authRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
    return <div className="bm-auth-root">{children}</div>
  }

  const accountName = user?.nickname || user?.username || 'Bangmio 用户'
  const avatar = avatarUrl(user || undefined)

  return <div className="bm-shell">
    <button className={`bm-scrim ${menuOpen ? 'is-visible' : ''}`} type="button" aria-label="关闭导航" onClick={() => setMenuOpen(false)} />
    <aside className={`bm-sidebar ${menuOpen ? 'is-open' : ''}`}>
      <div className="bm-brand-row">
        <Link href="/" className="bm-brand"><img src="/logo.png" alt="Bangmio" /><span>Bangmio</span></Link>
        <button className="bm-icon-button bm-mobile-only" type="button" aria-label="关闭导航" onClick={() => setMenuOpen(false)}><Icon name="close" /></button>
      </div>
      <p className="bm-sidebar-kicker">发现你的番剧世界</p>
      <nav className="bm-nav" aria-label="主导航">
        {navItems.map(item => <Link key={item.href} href={item.href} className={`bm-nav-item ${isActive(pathname, item.href) ? 'is-active' : ''}`}>
          <span className="bm-nav-icon"><Icon name={item.icon} /></span>
          <span><strong>{item.label}</strong><small>{item.detail}</small></span>
          <i />
        </Link>)}
      </nav>
      <div className="bm-sidebar-bottom">
        {isAuthenticated ? <div className="bm-account-card">
          <Link href="/profile" className="bm-account-link">
            <span className="bm-avatar">{avatar ? <img src={avatar} alt={accountName} /> : accountName.slice(0, 1).toUpperCase()}</span>
            <span><strong>{accountName}</strong><small>查看个人主页</small></span>
          </Link>
          <button type="button" onClick={logout}>退出</button>
        </div> : <Link href="/login" className="bm-login-card"><span className="bm-nav-icon"><Icon name="login" /></span><span><strong>登录 Bangmio</strong><small>同步收藏与追番进度</small></span><b>›</b></Link>}
        <button className="bm-theme-button" type="button" onClick={toggleTheme}><Icon name={theme === 'dark' ? 'sun' : 'moon'} />{theme === 'dark' ? '切换浅色模式' : '切换深色模式'}</button>
      </div>
    </aside>

    <header className="bm-mobile-header">
      <button className="bm-icon-button" type="button" aria-label="打开导航" onClick={() => setMenuOpen(true)}><Icon name="menu" /></button>
      <Link href="/" className="bm-brand"><img src="/logo.png" alt="Bangmio" /><span>Bangmio</span></Link>
      <button className="bm-icon-button" type="button" aria-label="切换主题" onClick={toggleTheme}><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
    </header>

    <div className="bm-page-column">
      <main className="bm-main">{children}</main>
    </div>

    <nav className="bm-bottom-nav" aria-label="移动端导航">
      {navItems.slice(0, 4).map(item => <Link key={item.href} href={item.href} className={isActive(pathname, item.href) ? 'is-active' : ''}><Icon name={item.icon} /><span>{item.label === '新番时间表' ? '时间表' : item.label}</span></Link>)}
      <Link href={isAuthenticated ? '/profile' : '/login'} className={isActive(pathname, '/profile') ? 'is-active' : ''}><Icon name="user" /><span>{isAuthenticated ? '我的' : '登录'}</span></Link>
    </nav>
  </div>
}
