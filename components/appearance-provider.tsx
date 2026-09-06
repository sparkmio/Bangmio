'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'

type Theme = 'light' | 'dark'
type AppearanceContextValue = {
  theme: Theme
  motion: boolean
  glass: boolean
  toggleTheme: () => void
  setMotion: (enabled: boolean) => void
  setGlass: (enabled: boolean) => void
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null)

function readBoolean(key: string, fallback: boolean) {
  try {
    const value = window.localStorage.getItem(key)
    return value === null ? fallback : value !== 'false'
  } catch {
    return fallback
  }
}

function applyAppearance(theme: Theme, motion: boolean, glass: boolean) {
  const root = document.documentElement
  root.dataset.theme = theme
  root.dataset.motion = motion ? 'on' : 'off'
  root.dataset.glass = glass ? 'on' : 'off'
  root.classList.toggle('dark', theme === 'dark')
  root.classList.toggle('light', theme === 'light')
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')
  const [motion, setMotionState] = useState(true)
  const [glass, setGlassState] = useState(true)

  useEffect(() => {
    let savedTheme: Theme = 'light'
    try {
      savedTheme = window.localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'
    } catch {
      // Private browsing/storage-disabled environments use the defaults.
    }
    const savedMotion = readBoolean(
      'appearance-motion',
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
    const savedGlass = readBoolean('appearance-glass', true)
    setTheme(savedTheme)
    setMotionState(savedMotion)
    setGlassState(savedGlass)
    applyAppearance(savedTheme, savedMotion, savedGlass)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(current => {
      const next = current === 'dark' ? 'light' : 'dark'
      try {
        window.localStorage.setItem('theme', next)
      } catch {}
      applyAppearance(next, motion, glass)
      return next
    })
  }, [glass, motion])

  const setMotion = useCallback(
    (enabled: boolean) => {
      setMotionState(enabled)
      try {
        window.localStorage.setItem('appearance-motion', String(enabled))
      } catch {}
      applyAppearance(theme, enabled, glass)
    },
    [glass, theme]
  )

  const setGlass = useCallback(
    (enabled: boolean) => {
      setGlassState(enabled)
      try {
        window.localStorage.setItem('appearance-glass', String(enabled))
      } catch {}
      applyAppearance(theme, motion, enabled)
    },
    [motion, theme]
  )

  const value = useMemo(
    () => ({ theme, motion, glass, toggleTheme, setMotion, setGlass }),
    [glass, motion, setGlass, setMotion, theme, toggleTheme]
  )
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
}

export function useAppearance() {
  const value = useContext(AppearanceContext)
  if (!value) throw new Error('useAppearance must be used within AppearanceProvider')
  return value
}

export function AppearanceSettings() {
  const { motion, glass, setMotion, setGlass } = useAppearance()
  return (
    <section className="bm-settings-panel" aria-labelledby="appearance-heading">
      <div>
        <p className="bm-settings-kicker">界面偏好</p>
        <h2 id="appearance-heading">外观与动效</h2>
        <p className="bm-settings-description">
          保留克制的层次感，也可以按设备性能或个人偏好关闭效果。
        </p>
      </div>
      <label className="bm-setting-row">
        <span>
          <strong>页面过渡动画</strong>
          <small>控制卡片、按钮和页面切换的轻量动效</small>
        </span>
        <input
          aria-label="页面过渡动画"
          type="checkbox"
          checked={motion}
          onChange={event => setMotion(event.target.checked)}
        />
      </label>
      <label className="bm-setting-row">
        <span>
          <strong>玻璃质感</strong>
          <small>启用导航和浮层的半透明磨砂效果，阅读内容仍保持实色背景</small>
        </span>
        <input
          aria-label="玻璃质感"
          type="checkbox"
          checked={glass}
          onChange={event => setGlass(event.target.checked)}
        />
      </label>
    </section>
  )
}
