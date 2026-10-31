'use client'

import { useEffect, useState } from 'react'
import { Modal } from './modal'

export const ANNOUNCEMENT_DISMISSED_KEY = 'bangmio:announcement-dismissed-date'
export const ANNOUNCEMENT_SESSION_KEY = 'bangmio:announcement-session-seen'

function localDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function AnnouncementPopup() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      const today = localDateKey(new Date())
      if (localStorage.getItem(ANNOUNCEMENT_DISMISSED_KEY) === today) return
      if (localStorage.getItem(ANNOUNCEMENT_SESSION_KEY) === today) return

      localStorage.setItem(ANNOUNCEMENT_SESSION_KEY, today)
      setOpen(true)
    } catch {
      setOpen(true)
    }
  }, [])

  useEffect(() => {
    const syncDismissal = (event: StorageEvent) => {
      if (event.key === ANNOUNCEMENT_DISMISSED_KEY && event.newValue === localDateKey(new Date())) {
        setOpen(false)
      }
      if (event.key === ANNOUNCEMENT_SESSION_KEY && event.newValue) setOpen(false)
    }
    window.addEventListener('storage', syncDismissal)
    return () => window.removeEventListener('storage', syncDismissal)
  }, [])

  const dismissForToday = () => {
    try {
      localStorage.setItem(ANNOUNCEMENT_DISMISSED_KEY, localDateKey(new Date()))
      localStorage.setItem(ANNOUNCEMENT_SESSION_KEY, localDateKey(new Date()))
    } catch {
      // The dialog should still close when browser storage is unavailable.
    }
    setOpen(false)
  }

  if (!open) return null

  return (
    <Modal title="网站公告" className="bm-announcement-dialog" onClose={() => setOpen(false)}>
      <section className="bm-announcement-modal" aria-labelledby="bm-announcement-title">
        <header className="bm-announcement-head">
          <span className="bm-announcement-mark" aria-hidden="true">
            !
          </span>
          <div>
            <p className="bm-announcement-kicker">BANGMIO NOTICE</p>
            <h2 id="bm-announcement-title">网站公告</h2>
          </div>
          <button
            className="bm-announcement-close"
            type="button"
            aria-label="关闭公告"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </header>
        <div className="bm-announcement-content">
          <p>
            Bangmio 正在持续维护与改进。番剧、评分、收藏及讨论数据主要来自
            Bangumi；上游服务波动时，部分内容可能延迟或暂时不可用。
          </p>
          <p>感谢理解。网站公告会直接在这里更新。</p>
        </div>
        <footer className="bm-announcement-actions">
          <button className="bm-announcement-snooze" type="button" onClick={dismissForToday}>
            本日不再提醒
          </button>
        </footer>
      </section>
    </Modal>
  )
}
