'use client'

import { useEffect, useRef, useState } from 'react'

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string
  remove: (widgetId: string) => void
  reset: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let turnstileScript: Promise<TurnstileApi> | null = null

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (turnstileScript) return turnstileScript

  turnstileScript = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-bangmio-turnstile]')
    if (existing) {
      existing.addEventListener('load', () => window.turnstile ? resolve(window.turnstile) : reject(new Error('人机验证组件加载失败')), { once: true })
      existing.addEventListener('error', () => reject(new Error('人机验证组件加载失败')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.dataset.bangmioTurnstile = 'true'
    script.onload = () => window.turnstile ? resolve(window.turnstile) : reject(new Error('人机验证组件加载失败'))
    script.onerror = () => reject(new Error('人机验证组件加载失败'))
    document.head.appendChild(script)
  })
  return turnstileScript
}

export function TurnstileWidget({
  siteKey,
  action,
  resetSignal,
  onVerify,
  onError
}: {
  siteKey?: string
  action: string
  resetSignal: number
  onVerify: (token: string) => void
  onError: (message: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<string | undefined>(undefined)
  const onVerifyRef = useRef(onVerify)
  const onErrorRef = useRef(onError)
  const [loading, setLoading] = useState(Boolean(siteKey))

  onVerifyRef.current = onVerify
  onErrorRef.current = onError

  useEffect(() => {
    if (!siteKey || !containerRef.current) return
    let cancelled = false
    setLoading(true)
    void loadTurnstile()
      .then(turnstile => {
        if (cancelled || !containerRef.current) return
        widgetRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme: 'auto',
          callback: (token: string) => {
            setLoading(false)
            onVerifyRef.current(String(token))
          },
          'expired-callback': () => {
            onVerifyRef.current('')
            onErrorRef.current('人机验证已过期，请重新完成验证')
          },
          'error-callback': () => {
            onVerifyRef.current('')
            setLoading(false)
            onErrorRef.current('人机验证加载失败，请检查网络后重试')
          }
        })
      })
      .catch(error => {
        if (!cancelled) {
          setLoading(false)
          onErrorRef.current(error instanceof Error ? error.message : '人机验证组件加载失败')
        }
      })
    return () => {
      cancelled = true
      if (widgetRef.current && window.turnstile) window.turnstile.remove(widgetRef.current)
      widgetRef.current = undefined
    }
  }, [action, siteKey])

  useEffect(() => {
    if (widgetRef.current && window.turnstile) window.turnstile.reset(widgetRef.current)
  }, [resetSignal])

  if (!siteKey) return null
  return <div className="bm-turnstile">
    <div ref={containerRef} className="bm-turnstile-frame" />
    {loading ? <p className="bm-turnstile-status">正在加载人机验证…</p> : null}
  </div>
}
