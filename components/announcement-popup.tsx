'use client'

import { useEffect, useState } from 'react'
import { Modal } from './modal'

export const ANNOUNCEMENT_DISMISSED_KEY = 'bangmio:announcement-dismissed-date'
export const ANNOUNCEMENT_URL =
  'https://app.notion.com/p/40a0fe6c7f2f80c39299ecb6b5c7bb9b?source=copy_link'

function localDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function AnnouncementPopup() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      setOpen(localStorage.getItem(ANNOUNCEMENT_DISMISSED_KEY) !== localDateKey(new Date()))
    } catch {
      setOpen(true)
    }
  }, [])

  const dismissForToday = () => {
    try {
      localStorage.setItem(ANNOUNCEMENT_DISMISSED_KEY, localDateKey(new Date()))
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
          <iframe
            className="bm-announcement-frame"
            src={ANNOUNCEMENT_URL}
            title="Bangmio 实时公告"
            loading="eager"
          />
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
