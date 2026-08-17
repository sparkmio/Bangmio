'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from './auth-provider'

const links = [
  { href: '/', label: '首页' },
  { href: '/trending', label: '趋势' },
  { href: '/anime', label: '找番' },
  { href: '/groups', label: '小组' }
]

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <div className="site-root">
      <header className="topbar">
        <div className="shell topbar-inner">
          <Link className="brand" href="/">
            <span className="brand-mark">B</span>
            <span>Bangmio</span>
          </Link>
          <nav className="desktop-nav" aria-label="主导航">
            {links.map(link => (
              <Link key={link.href} className={pathname === link.href ? 'nav-link active' : 'nav-link'} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="topbar-actions">
            {isAuthenticated ? (
              <>
                <Link className="avatar-chip" href="/profile">
                  <span className="avatar">{(user?.nickname || user?.username || '我').slice(0, 1)}</span>
                  <span className="avatar-name">{user?.nickname || user?.username || '我的空间'}</span>
                </Link>
                <button className="button ghost compact" onClick={logout} type="button">退出</button>
              </>
            ) : (
              <Link className="button primary compact" href="/login">登录</Link>
            )}
          </div>
        </div>
      </header>
      <main className="shell page-content">{children}</main>
      <nav className="mobile-nav" aria-label="移动端主导航">
        {links.slice(0, 4).map(link => (
          <Link key={link.href} className={pathname === link.href ? 'mobile-nav-link active' : 'mobile-nav-link'} href={link.href}>
            <span className="mobile-nav-icon">{link.label.slice(0, 1)}</span>
            <span>{link.label}</span>
          </Link>
        ))}
      </nav>
      <footer className="footer shell">
        <span>Bangmio · 让追番记录更有秩序</span>
        <Link href="/about">关于项目</Link>
      </footer>
    </div>
  )
}
