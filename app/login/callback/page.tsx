'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ApiResult, User } from '@/lib/types'
import { useAuth } from '@/components/auth-provider'

function safeRedirect(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/'
  return value
}

function CallbackContent() {
  const router = useRouter()
  const search = useSearchParams()
  const { setAuth, fetchBgmToken, fetchBgmUserProfile, token } = useAuth()
  const [message, setMessage] = useState('正在完成 Bangumi 授权…')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const code = search.get('code')
    const state = search.get('state')
    const flow = localStorage.getItem('bangmio_oauth_flow') || 'login'
    const redirect = safeRedirect(localStorage.getItem('bangmio_oauth_redirect'))
    if (!code || !state) {
      setFailed(true)
      setMessage(search.get('error_description') || '授权回调缺少必要参数，请重新登录。')
      return
    }
    const endpoint = flow === 'bind' ? '/api/v1/auth/oauth-bind-callback' : '/api/v1/user/oauth-callback'
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const bindToken = token || localStorage.getItem('bangmio_token') || ''
    if (flow === 'bind' && bindToken) headers.Authorization = `Bearer ${bindToken}`

    let alive = true
    void fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ code, state }) })
      .then(async response => {
        const payload = await response.json().catch(() => ({})) as ApiResult<{ token?: string; user?: User; bgmToken?: string }>
        if (!response.ok || !payload.data?.user) throw new Error(payload.error || 'Bangumi 授权失败')
        if (!alive) return
        if (flow === 'bind') {
          if (payload.data.token) setAuth(payload.data.token, payload.data.user, 'bangmio')
          if (payload.data.bgmToken) localStorage.setItem('bgm_token_cached', payload.data.bgmToken)
          await fetchBgmToken()
          await fetchBgmUserProfile()
          router.replace('/profile')
        } else {
          setAuth(payload.data.token || '', payload.data.user, 'bangumi')
          router.replace(redirect)
        }
        localStorage.removeItem('bangmio_oauth_flow')
        localStorage.removeItem('bangmio_oauth_redirect')
        router.refresh()
      })
      .catch(error => {
        if (!alive) return
        setFailed(true)
        setMessage(error instanceof Error ? error.message : 'Bangumi 授权失败')
      })
    return () => { alive = false }
  }, [fetchBgmToken, fetchBgmUserProfile, router, search, setAuth, token])

  return <div className="bm-auth-page">
    <Link className="bm-auth-brand" href="/"><img src="/logo.png" alt="" /><span>Bangmio</span></Link>
    <section className="bm-auth-card bm-auth-card-single">
      <header className="bm-auth-card-head"><span className="bm-auth-mobile-mark"><img src="/logo.png" alt="" /></span><div><span className="bm-auth-eyebrow">BANGUMI OAUTH</span><h1>{failed ? '登录未完成' : '正在登录'}</h1><p>{message}</p></div></header>
      {failed ? <div className="bm-auth-form"><Link className="bm-primary-button" href="/login?mode=bangumi">重新登录</Link><Link className="bm-auth-note" href="/">返回首页</Link></div> : <div className="bm-auth-message" role="status">请稍候，不要关闭页面。</div>}
    </section>
  </div>
}

export default function LoginCallbackPage() {
  return <Suspense fallback={<div className="bm-auth-loading">正在准备 OAuth 回调…</div>}><CallbackContent /></Suspense>
}
