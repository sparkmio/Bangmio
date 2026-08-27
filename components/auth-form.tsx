'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { ApiResult, User } from '@/lib/types'
import { useAuth } from './auth-provider'

type Mode = 'login' | 'register' | 'bangumi' | 'bind'

function errorMessage(payload: { error?: string }, fallback: string) { return payload.error || fallback }

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const search = useSearchParams()
  const { setAuth, token, isBangmioUser, fetchBgmToken, fetchBgmUserProfile } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [bangumiToken, setBangumiToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const currentMode: Mode = mode === 'login' && search.get('mode') === 'bangumi' ? 'bangumi' : mode
  const isBangumi = currentMode === 'bangumi' || currentMode === 'bind'
  const redirect = search.get('redirect') || '/'

  useEffect(() => {
    if (!seconds) return
    const timer = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [seconds])

  async function sendCode() {
    const normalizedEmail = email.trim()
    if (!normalizedEmail) { setMessage('请先输入邮箱地址'); return }
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/v1/auth/send-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: normalizedEmail, purpose: 'register' }) })
      const payload = await response.json().catch(() => ({})) as ApiResult<{ cooldown?: number }>
      if (!response.ok) throw new Error(errorMessage(payload, '验证码发送失败'))
      setCodeSent(true); setSeconds(payload.data?.cooldown || 60)
    } catch (error) { setMessage(error instanceof Error ? error.message : '验证码发送失败') } finally { setBusy(false) }
  }

  async function openOAuth(flow: 'login' | 'bind') {
    setBusy(true); setMessage('')
    try {
      const endpoint = flow === 'bind' ? '/api/v1/auth/oauth-bind-url' : '/api/v1/user/oauth-url'
      const bindToken = token || localStorage.getItem('bangmio_token') || ''
      const headers = flow === 'bind' && bindToken ? { Authorization: `Bearer ${bindToken}` } : undefined
      const response = await fetch(endpoint, { headers })
      const payload = await response.json().catch(() => ({})) as ApiResult<string | { url?: string }>
      if (!response.ok) throw new Error(errorMessage(payload, '无法开始授权'))
      const url = typeof payload.data === 'string' ? payload.data : payload.data?.url
      if (!url) throw new Error('授权地址无效')
      localStorage.setItem('bangmio_oauth_flow', flow)
      window.location.assign(url)
    } catch (error) { setMessage(error instanceof Error ? error.message : '无法开始授权'); setBusy(false) }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      const normalizedEmail = email.trim()
      const normalizedCode = code.trim()
      const normalizedBangumiToken = bangumiToken.trim()
      if (currentMode === 'login') {
        const response = await fetch('/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: normalizedEmail, password }) })
        const payload = await response.json().catch(() => ({})) as ApiResult<{ token: string; user: User }>
        if (!response.ok || !payload.data?.token || !payload.data.user) throw new Error(errorMessage(payload, '登录失败'))
        setAuth(payload.data.token, payload.data.user)
        if (payload.data.user.bgmUid) { await fetchBgmToken(); await fetchBgmUserProfile() }
        router.replace(redirect); router.refresh(); return
      }
      if (currentMode === 'register') {
        const response = await fetch('/api/v1/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: normalizedEmail, password, code: normalizedCode }) })
        const payload = await response.json().catch(() => ({})) as ApiResult<{ token: string; user: User }>
        if (!response.ok || !payload.data?.token || !payload.data.user) throw new Error(errorMessage(payload, '注册失败'))
        setAuth(payload.data.token, payload.data.user)
        router.replace('/bind-bangumi'); router.refresh(); return
      }
      if (currentMode === 'bind') {
        if (!isBangmioUser || !token) throw new Error('请先使用 Bangmio 账号登录')
        const response = await fetch('/api/v1/auth/bind-bangumi', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ bangumiToken: normalizedBangumiToken }) })
        const payload = await response.json().catch(() => ({})) as ApiResult<{ token: string; user: User }>
        if (!response.ok || !payload.data?.token || !payload.data.user) throw new Error(errorMessage(payload, '绑定失败'))
        setAuth(payload.data.token, payload.data.user)
        localStorage.setItem('bgm_token_cached', normalizedBangumiToken)
        await fetchBgmUserProfile()
        router.replace('/profile'); router.refresh(); return
      }
      const response = await fetch('/api/v1/user/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: normalizedBangumiToken }) })
      const payload = await response.json().catch(() => ({})) as ApiResult<{ token: string; user: User }>
      if (!response.ok || !payload.data?.user) throw new Error(errorMessage(payload, 'Token 验证失败'))
      setAuth(payload.data.token || normalizedBangumiToken, payload.data.user, 'bangumi')
      router.replace(redirect); router.refresh()
    } catch (error) { setMessage(error instanceof Error ? error.message : '操作失败') } finally { setBusy(false) }
  }

  const title = currentMode === 'register' ? '创建 Bangmio 账号' : currentMode === 'bind' ? '绑定 Bangumi 账号' : currentMode === 'bangumi' ? '登录 Bangumi' : '登录 Bangmio'
  return <div className="max-w-md mx-auto mt-6">
    <div className="card bg-base-100 border border-base-300"><div className="card-body p-8">
      <div className="text-center mb-6"><img src="/logo.png" alt="Bangmio" className="w-16 h-16 mx-auto rounded-2xl mb-3" decoding="async" /><h1 className="text-2xl font-bold text-base-content">{title}</h1>{currentMode === 'register' ? <p className="text-sm text-base-content/60 mt-2">创建账号后即可同步收藏、追番进度和社区内容。</p> : null}</div>
      {currentMode === 'login' ? <div className="flex gap-1 mb-4 bg-base-200 p-1 rounded-lg"><button className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${!isBangumi ? 'bg-base-100 text-primary shadow-sm' : 'text-base-content/60 hover:text-base-content'}`} type="button" onClick={() => router.replace('/login')}>Bangmio 账号</button><button className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${isBangumi ? 'bg-base-100 text-primary shadow-sm' : 'text-base-content/60 hover:text-base-content'}`} type="button" onClick={() => router.replace('/login?mode=bangumi')}>Bangumi 直登</button></div> : null}
      {message ? <div className="alert alert-error mb-4"><span>{message}</span></div> : null}
      {!isBangumi ? <form className="flex flex-col gap-3" onSubmit={submit}><input value={email} onChange={event => setEmail(event.target.value)} type="email" placeholder="邮箱" className="input input-bordered w-full" autoComplete="email" required /><input value={password} onChange={event => setPassword(event.target.value)} type="password" placeholder="密码" className="input input-bordered w-full" autoComplete={currentMode === 'register' ? 'new-password' : 'current-password'} minLength={8} required />{currentMode === 'login' ? <div className="flex justify-end -mt-1"><Link href="/forgot-password" className="text-xs link link-primary">忘记密码？</Link></div> : null}{currentMode === 'register' ? <div className="flex gap-2"><input value={code} onChange={event => setCode(event.target.value)} className="input input-bordered flex-1" placeholder="邮箱验证码" required /><button className="btn btn-outline btn-sm" type="button" disabled={busy || seconds > 0} onClick={sendCode}>{seconds > 0 ? `${seconds}s 后重发` : codeSent ? '重新发送' : '发送验证码'}</button></div> : null}<button type="submit" disabled={busy} className="btn btn-primary w-full">{busy ? '处理中...' : currentMode === 'register' ? '注册并继续' : '登录'}</button></form> : <div className="flex flex-col gap-3"><button disabled={busy} className="btn w-full bg-[#2D89EF] text-white border-none hover:brightness-110" type="button" onClick={() => void openOAuth(currentMode === 'bind' ? 'bind' : 'login')}>{busy ? '跳转中...' : currentMode === 'bind' ? '使用 Bangumi 一键授权绑定' : '使用 Bangumi 账号登录'}</button><div className="divider text-xs text-base-content/40">{currentMode === 'bind' ? '或手动粘贴 Token' : '或手动输入 Token'}</div><form className="flex flex-col gap-3" onSubmit={submit}><input value={bangumiToken} onChange={event => setBangumiToken(event.target.value)} type="password" placeholder="粘贴 Bangumi Access Token" className="input input-bordered w-full" required /><button type="submit" disabled={busy || !bangumiToken} className="btn btn-primary w-full">{busy ? (currentMode === 'bind' ? '绑定中...' : '验证中...') : currentMode === 'bind' ? '立即绑定' : 'Token 登录'}</button></form><p className="text-xs text-center mt-2 text-base-content/50">前往 <a href="https://next.bgm.tv/demo/access-token" target="_blank" rel="noreferrer" className="link link-primary">next.bgm.tv/demo/access-token</a> 获取 Token</p></div>}
      {currentMode === 'login' && !isBangumi ? <p className="text-sm text-center mt-2 text-base-content/50">还没账号？ <Link href="/register" className="link link-primary">立即注册</Link></p> : null}
      {currentMode === 'bind' ? <p className="text-sm text-center mt-4 text-base-content/50"><Link href="/" className="link link-primary">稍后绑定（功能受限）</Link></p> : null}
      {currentMode === 'register' ? <p className="text-sm text-center mt-4 text-base-content/50">已有账号？ <Link href="/login" className="link link-primary">返回登录</Link></p> : null}
    </div></div>
  </div>
}
