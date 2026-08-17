'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ApiResult, User } from '@/lib/types'
import { useAuth } from '@/components/auth-provider'

function CallbackContent() {
  const router = useRouter()
  const search = useSearchParams()
  const { setAuth, fetchBgmToken, fetchBgmUserProfile, token } = useAuth()
  const [message, setMessage] = useState('正在完成登录…')
  useEffect(() => {
    const code = search.get('code'); const state = search.get('state'); const flow = localStorage.getItem('bangmio_oauth_flow') || 'login'
    if (!code || !state) { setMessage('缺少 OAuth 参数'); return }
    const endpoint = flow === 'bind' ? '/api/v1/auth/oauth-bind-callback' : '/api/v1/user/oauth-callback'
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (flow === 'bind' && token) headers.Authorization = `Bearer ${token}`
    fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ code, state }) }).then(async response => {
      const payload = await response.json().catch(() => ({})) as ApiResult<{ token?: string; user?: User; bgmToken?: string }>
      if (!response.ok || !payload.data?.user) throw new Error(payload.error || '授权失败')
      if (flow === 'bind') {
        if (payload.data.token) setAuth(payload.data.token, payload.data.user, 'bangmio')
        if (payload.data.bgmToken) localStorage.setItem('bgm_token_cached', payload.data.bgmToken)
        await fetchBgmToken(); await fetchBgmUserProfile(); router.replace('/profile')
      } else { setAuth(payload.data.token || '', payload.data.user, 'bangumi'); router.replace('/') }
      localStorage.removeItem('bangmio_oauth_flow')
    }).catch(error => setMessage(error instanceof Error ? error.message : '授权失败'))
  }, [fetchBgmToken, fetchBgmUserProfile, router, search, setAuth, token])
  return <div className="panel form-card"><div className="eyebrow">OAuth</div><h1>{message === '正在完成登录…' ? '正在登录' : '登录未完成'}</h1><p>{message}</p></div>
}

export default function LoginCallbackPage() { return <Suspense fallback={<div className="panel form-card"><h1>正在登录</h1><p>正在准备 OAuth 回调…</p></div>}><CallbackContent /></Suspense> }
