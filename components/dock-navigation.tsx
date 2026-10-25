'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { useAppearance } from '@/components/appearance-provider'
import { DETAIL_TABS, detailTabFrom, type DetailTabKey } from '@/lib/detail-tabs'

// 导航项配置
const navItems = [
  { href: '/', label: '首页', shortLabel: '首页', icon: 'home' },
  { href: '/trending', label: '新番时间表', shortLabel: '新番', icon: 'trending' },
  { href: '/anime', label: '浏览', shortLabel: '浏览', icon: 'browse' },
  { href: '/groups', label: '小组', shortLabel: '小组', icon: 'groups' },
  { href: '/about', label: '关于', shortLabel: '关于', icon: 'about' },
  { href: '/settings', label: '设置', shortLabel: '设置', icon: 'settings' }
] as const

// 移动端底部栏只放最常用的 4 项 + 我的/登录，等分整行避免挤压；其余入口在桌面 Dock 和页面内可达。
const mobileNavItems = navItems.slice(0, 4)

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

function BackIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  )
}

const ACTIVE_BG = 'rgba(232, 144, 156, 0.18)'
const activePillStyle = {
  background: ACTIVE_BG,
  color: 'var(--bm-accent)'
} as const

function DesktopDetailTabPills({
  detailId,
  activeTab
}: {
  detailId: string
  activeTab: DetailTabKey
}) {
  return (
    <>
      {DETAIL_TABS.map(([key, label]) => {
        const isActive = activeTab === key
        return (
          <Link
            key={key}
            href={`/anime/${detailId}?tab=${key}`}
            aria-current={isActive ? 'page' : undefined}
            className={`bm-dock-pill bm-dock-desktop-detail-pill ${isActive ? 'bm-dock-pill-active' : ''}`}
            style={isActive ? activePillStyle : undefined}
          >
            {label}
          </Link>
        )
      })}
    </>
  )
}

function MobileDetailTabPills({
  detailId,
  activeTab
}: {
  detailId: string
  activeTab: DetailTabKey
}) {
  return (
    <>
      {DETAIL_TABS.map(([key, label]) => {
        const isActive = activeTab === key
        return (
          <Link
            key={key}
            href={`/anime/${detailId}?tab=${key}`}
            aria-current={isActive ? 'page' : undefined}
            className={`bm-dock-pill bm-dock-mobile-detail-pill ${isActive ? 'bm-dock-pill-active' : ''}`}
            style={isActive ? activePillStyle : undefined}
          >
            {label}
          </Link>
        )
      })}
    </>
  )
}

// 只有这个小组件读 ?tab=，并被 Suspense 包裹，保证 Dock 其余部分（全局导航）在静态页也能服务端渲染。
function DetailTabPills({
  detailId,
  sub,
  variant
}: {
  detailId: string
  sub?: string
  variant: 'desktop' | 'mobile'
}) {
  const searchParams = useSearchParams()
  const activeTab: DetailTabKey = sub
    ? (sub as DetailTabKey)
    : detailTabFrom(searchParams.get('tab'))
  return variant === 'desktop' ? (
    <DesktopDetailTabPills detailId={detailId} activeTab={activeTab} />
  ) : (
    <MobileDetailTabPills detailId={detailId} activeTab={activeTab} />
  )
}

export function DockNavigation() {
  const pathname = usePathname()
  const router = useRouter()
  const auth = useAuth()
  const appearance = useAppearance()

  const handleBack = () => {
    if (typeof window === 'undefined') return
    const sameOriginReferrer = document.referrer.startsWith(window.location.origin)
    if (!sameOriginReferrer || window.history.length <= 1) {
      router.push('/anime')
      return
    }
    const currentPath = `${window.location.pathname}${window.location.search}`
    router.back()
    window.setTimeout(() => {
      const nextPath = `${window.location.pathname}${window.location.search}`
      if (nextPath === currentPath) router.push('/anime')
    }, 400)
  }

  // 番剧详情页（含吐槽/讨论子页）：Dock 切换为「返回 + 板块栏」
  const detailMatch = pathname.match(/^\/anime\/(\d+)(?:\/(talkbox|topics))?\/?$/)
  const detailId = detailMatch?.[1]
  const detailSub = detailMatch?.[2] as DetailTabKey | undefined

  const avatarSrc =
    auth.isAuthenticated && auth.user?.avatar
      ? typeof auth.user.avatar === 'string'
        ? auth.user.avatar
        : auth.user.avatar.medium || ''
      : ''

  return (
    <>
      {/* PC / 横屏：左侧独立椭圆按钮。 */}
      <aside className="bm-dock-desktop" aria-label="主导航">
        <nav className="bm-dock-scroll">
          {detailId ? (
            <>
              <button
                type="button"
                onClick={handleBack}
                aria-label="返回上一页"
                className="bm-dock-pill bm-dock-desktop-action"
              >
                <BackIcon className="w-5 h-5 shrink-0" />
                返回
              </button>
              <Suspense
                fallback={
                  <DesktopDetailTabPills detailId={detailId} activeTab={detailSub ?? 'overview'} />
                }
              >
                <DetailTabPills detailId={detailId} sub={detailSub} variant="desktop" />
              </Suspense>
            </>
          ) : (
            <>
              {navItems.map(item => {
                const Icon = iconComponents[item.icon as keyof typeof iconComponents]
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                    className={`bm-dock-pill bm-dock-desktop-action ${isActive ? 'bm-dock-pill-active' : ''}`}
                    style={isActive ? activePillStyle : undefined}
                    title={item.label}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                )
              })}

              {/* 主题切换也保持和其他入口一致的椭圆按钮。 */}
              <button
                type="button"
                onClick={() => appearance.toggleTheme()}
                aria-label={appearance.theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
                className="bm-dock-pill bm-dock-desktop-action"
              >
                {appearance.theme === 'dark' ? (
                  <SunIcon className="w-5 h-5" />
                ) : (
                  <MoonIcon className="w-5 h-5" />
                )}
                <span>主题</span>
              </button>

              {/* 用户头像 / 登录 */}
              <Link
                href={auth.isAuthenticated ? '/profile' : '/login'}
                aria-label={auth.isAuthenticated ? '我的' : '登录'}
                className="bm-dock-pill bm-dock-desktop-action"
              >
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={auth.user?.nickname || auth.user?.username || ''}
                    className="w-6 h-6 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <UserIcon className="w-5 h-5" />
                )}
                <span>{auth.isAuthenticated ? '我的' : '登录'}</span>
              </Link>
            </>
          )}
        </nav>
      </aside>

      {/* 移动端 / 竖屏：底部独立椭圆按钮，详情页允许横向滚动。 */}
      <nav className="bm-dock-mobile" aria-label="移动端导航">
        {detailId ? (
          <div className="bm-dock-mobile-track bm-dock-mobile-track-detail">
            <button
              type="button"
              onClick={handleBack}
              aria-label="返回上一页"
              className="bm-dock-pill bm-dock-mobile-back"
            >
              <BackIcon className="w-5 h-5" />
              返回
            </button>
            <Suspense
              fallback={
                <MobileDetailTabPills detailId={detailId} activeTab={detailSub ?? 'overview'} />
              }
            >
              <DetailTabPills detailId={detailId} sub={detailSub} variant="mobile" />
            </Suspense>
          </div>
        ) : (
          <div className="bm-dock-mobile-track">
            {mobileNavItems.map(item => {
              const Icon = iconComponents[item.icon as keyof typeof iconComponents]
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`bm-dock-pill bm-dock-mobile-pill ${isActive ? 'bm-dock-pill-active' : ''}`}
                  style={isActive ? activePillStyle : undefined}
                >
                  <Icon className="w-6 h-6" />
                  <span className="bm-leading-none text-[10px] font-medium">{item.shortLabel}</span>
                </Link>
              )
            })}
            <Link
              href={auth.isAuthenticated ? '/profile' : '/login'}
              aria-label={auth.isAuthenticated ? '我的' : '登录'}
              aria-current={pathname === '/profile' ? 'page' : undefined}
              className={`bm-dock-pill bm-dock-mobile-pill ${pathname === '/profile' ? 'bm-dock-pill-active' : ''}`}
              style={pathname === '/profile' ? activePillStyle : undefined}
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={auth.user?.nickname || auth.user?.username || ''}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <UserIcon className="w-6 h-6" />
              )}
              <span className="bm-leading-none text-[10px] font-medium">
                {auth.isAuthenticated ? '我的' : '登录'}
              </span>
            </Link>
          </div>
        )}
      </nav>
    </>
  )
}
