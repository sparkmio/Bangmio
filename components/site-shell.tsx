'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from './auth-provider'
import { avatarUrl } from '@/lib/api'

type IconName = 'home' | 'calendar' | 'search' | 'groups' | 'about' | 'settings'

const links: Array<{ href: string; label: string; icon: IconName }> = [
  { href: '/', label: '首页', icon: 'home' },
  { href: '/trending', label: '新番时间表', icon: 'calendar' },
  { href: '/anime', label: '搜索', icon: 'search' },
  { href: '/groups', label: '小组', icon: 'groups' },
  { href: '/about', label: '关于我们', icon: 'about' },
  { href: '/settings', label: '设置', icon: 'settings' }
]

function NavIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h5v-6h4v6h5V10" /></>,
    calendar: <><path d="M4 5h16v15H4z" /><path d="M8 3v4M16 3v4M4 9h16" /><path d="m8 14 2 2 5-5" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    groups: <><path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 20v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    about: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1V21h-4v-.08a1.7 1.7 0 0 0-1.1-1.52 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4H3v-4h.08A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1V3h4v.08A1.7 1.7 0 0 0 15.5 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.2.36.48.7.82.92.3.2.64.32 1 .36H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z" /></>
  }
  return <svg className="nav-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><img src="/logo.png" alt="" /></span>
}

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, isAuthenticated, logout } = useAuth()
  const name = user?.nickname || user?.username || '我的空间'
  const avatar = avatarUrl(user || undefined)

  return (
    <div className="site-root">
      <aside className="desktop-sidebar">
        <div className="brand-row"><Link className="brand" href="/" aria-label="Bangmio 首页"><BrandMark /><span>Bangmio</span></Link></div>
        <nav className="desktop-nav" aria-label="主导航">
          {links.map(link => <Link key={link.href} className={isActive(pathname, link.href) ? 'nav-link active' : 'nav-link'} href={link.href}><span>{link.label}</span></Link>)}
        </nav>
        <div className="sidebar-account">
          {isAuthenticated ? <>
            <Link className="avatar-chip" href="/profile">
              <span className="avatar">{avatar ? <img src={avatar} alt="" /> : name.slice(0, 1)}</span>
              <span className="account-copy"><strong>{name}</strong><small>查看主页</small></span>
            </Link>
            <button className="sidebar-logout" onClick={logout} type="button">退出登录</button>
          </> : <Link className="button primary sidebar-login" href="/login">登录 Bangmio</Link>}
          <span className="theme-note" aria-hidden="true">☾&nbsp; 深色模式</span>
        </div>
      </aside>

      <header className="mobile-topbar">
        <Link className="brand" href="/"><BrandMark /><span>Bangmio</span></Link>
        {isAuthenticated ? <Link className="avatar" href="/profile">{avatar ? <img src={avatar} alt="" /> : name.slice(0, 1)}</Link> : <Link className="button primary compact" href="/login">登录</Link>}
      </header>

      <main className="page-content">{children}</main>

      <nav className="mobile-nav" aria-label="移动端主导航">
        {links.slice(0, 4).map(link => <Link key={link.href} className={isActive(pathname, link.href) ? 'mobile-nav-link active' : 'mobile-nav-link'} href={link.href}><NavIcon name={link.icon} /><span>{link.label === '新番时间表' ? '时间表' : link.label}</span></Link>)}
      </nav>
    </div>
  )
}