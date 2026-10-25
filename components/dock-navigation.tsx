'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { useAppearance } from '@/components/appearance-provider'

// 导航项配置
const navItems = [
  { href: '/', label: '首页', icon: 'home' },
  { href: '/trending', label: '新番时间表', icon: 'trending' },
  { href: '/anime', label: '浏览', icon: 'browse' },
  { href: '/groups', label: '小组', icon: 'groups' },
  { href: '/about', label: '关于', icon: 'about' },
  { href: '/settings', label: '设置', icon: 'settings' }
] as const

// 图标 SVG 组件
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  )
}

function TrendingIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  )
}

function BrowseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  )
}

function GroupsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  )
}

function AboutIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  )
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  )
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  )
}

const iconComponents = {
  home: HomeIcon,
  trending: TrendingIcon,
  browse: BrowseIcon,
  groups: GroupsIcon,
  about: AboutIcon,
  settings: SettingsIcon,
  moon: MoonIcon,
  sun: SunIcon,
  user: UserIcon
}

export function DockNavigation() {
  const pathname = usePathname()
  const auth = useAuth()
  const appearance = useAppearance()

  return (
    <>
      {/* PC 端左侧 Dock */}
      <aside className="hidden md:flex fixed left-5 top-1/2 -translate-y-1/2 z-50">
        <nav
          className="bm-dock flex flex-col gap-2 p-3 rounded-[20px] border"
          style={{
            background: 'var(--bm-glass-surface)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
            borderColor: 'var(--bm-glass-border)'
          }}
        >
          {/* 导航图标 */}
          {navItems.map(item => {
            const Icon = iconComponents[item.icon as keyof typeof iconComponents]
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={`
                  flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-xl transition-all duration-300
                  hover:scale-105
                  ${
                    isActive
                      ? 'bg-[rgba(232,144,156,0.12)] text-[#E8909C]'
                      : 'hover:text-[var(--bm-text)]'
                  }
                `}
                style={{
                  color: isActive ? '#E8909C' : 'var(--bm-muted)'
                }}
                title={item.label}
              >
                <Icon className="w-6 h-6" />
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </Link>
            )
          })}

          {/* 分隔线 */}
          <div className="h-px bg-[var(--bm-line)] my-1" />

          {/* 主题切换按钮 */}
          <button
            onClick={() => appearance.toggleTheme()}
            aria-label={appearance.theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
            className="flex items-center justify-center w-12 h-12 self-center rounded-xl transition-all duration-300 hover:scale-105"
            style={{ color: 'var(--bm-muted)' }}
          >
            {appearance.theme === 'dark' ? (
              <SunIcon className="w-6 h-6" />
            ) : (
              <MoonIcon className="w-6 h-6" />
            )}
          </button>

          {/* 用户头像 / 登录按钮 */}
          <Link
            href={auth.isAuthenticated ? '/profile' : '/login'}
            aria-label={auth.isAuthenticated ? '我的' : '登录'}
            className="flex items-center justify-center w-12 h-12 self-center rounded-xl transition-all duration-300 hover:scale-105"
            style={{ color: 'var(--bm-muted)' }}
          >
            {auth.isAuthenticated && auth.user?.avatar ? (
              <img
                src={
                  typeof auth.user.avatar === 'string'
                    ? auth.user.avatar
                    : auth.user.avatar.medium || ''
                }
                alt={auth.user?.nickname || auth.user?.username || ''}
                className="w-10 h-10 rounded-full ring-2 ring-[#E8909C]/20 object-cover"
              />
            ) : (
              <UserIcon className="w-6 h-6" />
            )}
          </Link>
        </nav>
      </aside>

      {/* 移动端底部 Dock */}
      <nav
        className="md:hidden fixed left-4 right-4 z-50 bm-dock"
        style={{
          bottom: '12px',
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}
      >
        <div
          className="flex justify-around items-center h-[68px] rounded-[24px] px-4 border"
          style={{
            background: 'var(--bm-glass-surface)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.06)',
            borderColor: 'var(--bm-glass-border)'
          }}
        >
          {navItems.slice(0, 4).map(item => {
            const Icon = iconComponents[item.icon as keyof typeof iconComponents]
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className="flex flex-col items-center justify-center gap-1 min-w-[44px] transition-all duration-300"
                style={{ color: isActive ? '#E8909C' : 'var(--bm-muted)' }}
              >
                <Icon className="w-6 h-6" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
          <Link
            href={auth.isAuthenticated ? '/profile' : '/login'}
            aria-label={auth.isAuthenticated ? '我的' : '登录'}
            className="flex flex-col items-center justify-center gap-1 min-w-[44px] transition-all duration-300"
            style={{ color: 'var(--bm-muted)' }}
          >
            {auth.isAuthenticated && auth.user?.avatar ? (
              <>
                <img
                  src={
                    typeof auth.user.avatar === 'string'
                      ? auth.user.avatar
                      : auth.user.avatar.medium || ''
                  }
                  alt={auth.user?.nickname || auth.user?.username || ''}
                  className="w-6 h-6 rounded-full ring-2 ring-[#E8909C]/20 object-cover"
                />
                <span className="text-[10px] font-medium">我的</span>
              </>
            ) : (
              <>
                <UserIcon className="w-6 h-6" />
                <span className="text-[10px] font-medium">登录</span>
              </>
            )}
          </Link>
        </div>
      </nav>
    </>
  )
}
