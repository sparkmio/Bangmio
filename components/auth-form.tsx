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
    if (!email) { setMessage('请先输入邮箱地址'); return }
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/v1/auth/send-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, purpose: 'register' }) })
      const payload = await response.json().catch(() => ({})) as ApiResult<{ cooldown?: number }>
      if (!response.ok) throw new Error(errorMessage(payload, '验证码发送失败'))
      setCodeSent(true); setSeconds(payload.data?.cooldown || 60)
    } catch (error) { setMessage(error instanceof Error ? error.message : '验证码发送失败') } finally { setBusy(false) }
  }

  async function openOAuth(flow: 'login' | 'bind') {
    setBusy(true); setMessage('')
    try {
      const endpoint = flow === 'bind' ? '/api/v1/auth/oauth-bind-url' : '/api/v1/user/oauth-url'
      const headers = flow === 'bind' && token ? { Authorization: `Bearer ${token}` } : undefined
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
      if (currentMode === 'login') {
        const response = await fetch('/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
        const payload = await response.json().catch(() => ({})) as ApiResult<{ token: string; user: User }>
        if (!response.ok || !payload.data?.token || !payload.data.user) throw new Error(errorMessage(payload, '登录失败'))
        setAuth(payload.data.token, payload.data.user)
        if (payload.data.user.bgmUid) { await fetchBgmToken(); await fetchBgmUserProfile() }
        router.replace(redirect); router.refresh(); return
      }
      if (currentMode === 'register') {
        const response = await fetch('/api/v1/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, code }) })
        const payload = await response.json().catch(() => ({})) as ApiResult<{ token: string; user: User }>
        if (!response.ok || !payload.data?.token || !payload.data.user) throw new Error(errorMessage(payload, '注册失败'))
        setAuth(payload.data.token, payload.data.user)
        router.replace('/bind-bangumi'); router.refresh(); return
      }
      if (currentMode === 'bind') {
        if (!isBangmioUser || !token) throw new Error('请先使用 Bangmio 账号登录')
        const response = await fetch('/api/v1/auth/bind-bangumi', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ bangumiToken }) })
        const payload = await response.json().catch(() => ({})) as ApiResult<{ token: string; user: User }>
        if (!response.ok || !payload.data?.token || !payload.data.user) throw new Error(errorMessage(payload, '绑定失败'))
        setAuth(payload.data.token, payload.data.user)
        localStorage.setItem('bgm_token_cached', bangumiToken)
        await fetchBgmUserProfile()
        router.replace('/profile'); router.refresh(); return
      }
      const response = await fetch('/api/v1/user/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: bangumiToken }) })
      const payload = await response.json().catch(() => ({})) as ApiResult<{ token: string; user: User }>
      if (!response.ok || !payload.data?.user) throw new Error(errorMessage(payload, 'Token 验证失败'))
      setAuth(payload.data.token || bangumiToken, payload.data.user, 'bangumi')
      router.replace(redirect); router.refresh()
    } catch (error) { setMessage(error instanceof Error ? error.message : '操作失败') } finally { setBusy(false) }
  }

  const title = currentMode === 'register' ? '创建 Bangmio 账号' : currentMode === 'bind' ? '绑定 Bangumi' : currentMode === 'bangumi' ? '使用 Access Token 登录' : '登录 Bangmio'
  return <div className="panel form-card"><div className="eyebrow">{currentMode === 'register' ? 'Create account' : isBangumi ? 'Bangumi access' : 'Welcome back'}</div><h1>{title}</h1><p>{currentMode === 'register' ? '验证邮箱后创建账号，再把收藏同步到 Bangumi。' : currentMode === 'bind' ? '绑定后，收藏、进度和个人页会使用你的 Bangumi 数据。' : isBangumi ? 'Token 仅保存在当前浏览器，用于读取并管理 Bangumi 数据。' : '登录后继续管理收藏、观看进度和社区内容。'}</p><form className="form-stack" onSubmit={submit}>{!isBangumi ? <><label>邮箱<input className="bangmio-input" type="email" value={email} onChange={event => setEmail(event.target.value)} required placeholder="you@example.com" /></label><label>密码<input className="bangmio-input" type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={8} placeholder="至少 8 位" /></label>{currentMode === 'register' ? <label>邮箱验证码<div className="inline-field"><input className="bangmio-input" value={code} onChange={event => setCode(event.target.value)} required placeholder="6 位验证码" /><button className="button ghost compact" type="button" disabled={busy || seconds > 0} onClick={sendCode}>{seconds > 0 ? `${seconds}s 后重发` : codeSent ? '重新发送' : '发送验证码'}</button></div></label> : null}</> : <label>Bangumi Access Token<textarea className="bangmio-input" value={bangumiToken} onChange={event => setBangumiToken(event.target.value)} required rows={4} placeholder="粘贴 Bangumi Access Token" /></label>}<button className="button primary" disabled={busy} type="submit">{busy ? '处理中…' : currentMode === 'register' ? '注册并继续' : currentMode === 'bind' ? '完成绑定' : '继续'}</button>{message ? <div className="form-message">{message}</div> : null}</form>{currentMode === 'login' ? <div className="auth-form-footer"><div>还没有账号？ <Link href="/register">去注册</Link></div><button className="text-button" disabled={busy} onClick={() => openOAuth('login')} type="button">使用 Bangumi OAuth 登录</button><Link href="/login?mode=bangumi">使用 Access Token 登录</Link><Link href="/forgot-password">忘记密码？</Link></div> : currentMode === 'bind' ? <div className="auth-form-footer"><button className="text-button" disabled={busy} onClick={() => openOAuth('bind')} type="button">使用 Bangumi OAuth 绑定</button><Link href="/profile">暂时跳过</Link></div> : currentMode === 'register' ? <div className="auth-form-footer">已有账号？<Link href="/login">返回登录</Link></div> : null}</div>
}
