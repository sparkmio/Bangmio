'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { ApiResult, User } from '@/lib/types'
import { useAuth } from './auth-provider'
import { TurnstileWidget } from './turnstile-widget'

type Mode = 'login' | 'register' | 'bangumi' | 'bind'
type TurnstileConfig = { required: boolean; siteKey?: string | null }

function errorMessage(payload: { error?: string }, fallback: string) {
  return payload.error || fallback
}

function safeRedirect(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/'
  return value
}

function AuthBrand() {
  return <Link className="bm-auth-brand" href="/" aria-label="返回 Bangmio 首页">
    <img src="/logo.png" alt="" />
    <span>Bangmio</span>
  </Link>
}

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
  const [turnstile, setTurnstile] = useState<TurnstileConfig>({ required: false })
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0)
  const currentMode: Mode = mode === 'login' && search.get('mode') === 'bangumi' ? 'bangumi' : mode
  const isBangumi = currentMode === 'bangumi' || currentMode === 'bind'
  const redirect = safeRedirect(search.get('redirect'))
  const needsCaptcha = !isBangumi && turnstile.required
  const canSubmit = !needsCaptcha || Boolean(captchaToken)
  const showLoginTabs = mode === 'login'

  useEffect(() => {
    if (!seconds) return
    const timer = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [seconds])

  useEffect(() => {
    if (isBangumi) return
    let alive = true
    void fetch('/api/v1/auth/config')
      .then(async response => ({ response, payload: await response.json().catch(() => ({})) as ApiResult<TurnstileConfig> }))
      .then(({ response, payload }) => {
        if (!alive || !response.ok || !payload.data) return
        const enabled = Boolean(payload.data.required && payload.data.siteKey)
        setTurnstile({ required: enabled, siteKey: enabled ? payload.data.siteKey : null })
      })
      .catch(() => undefined)
    return () => { alive = false }
  }, [isBangumi])

  function captchaError(text: string) {
    setMessage(text)
    setCaptchaToken('')
  }

  function resetCaptcha() {
    setCaptchaToken('')
    setCaptchaResetSignal(value => value + 1)
  }

  async function sendCode() {
    const normalizedEmail = email.trim()
    if (!normalizedEmail) { setMessage('请先输入邮箱地址'); return }
    if (!canSubmit) { setMessage('请先完成人机验证'); return }
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/v1/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, purpose: 'register', captchaToken })
      })
      const payload = await response.json().catch(() => ({})) as ApiResult<{ cooldown?: number }>
      if (!response.ok) throw new Error(errorMessage(payload, '验证码发送失败'))
      setCodeSent(true)
      setSeconds(payload.data?.cooldown || 60)
      setMessage('验证码已发送，请检查收件箱和垃圾邮件。')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '验证码发送失败')
    } finally {
      setBusy(false)
      resetCaptcha()
    }
  }

  async function openOAuth(flow: 'login' | 'bind') {
    setBusy(true)
    setMessage('')
    try {
      const endpoint = flow === 'bind' ? '/api/v1/auth/oauth-bind-url' : '/api/v1/user/oauth-url'
      const bindToken = token || localStorage.getItem('bangmio_token') || ''
      const headers = flow === 'bind' && bindToken ? { Authorization: `Bearer ${bindToken}` } : undefined
      const response = await fetch(endpoint, { headers })
      const payload = await response.json().catch(() => ({})) as ApiResult<string | { url?: string }>
      if (!response.ok) throw new Error(errorMessage(payload, '无法开始 Bangumi 授权'))
      const url = typeof payload.data === 'string' ? payload.data : payload.data?.url
      if (!url) throw new Error('Bangumi 授权地址无效')
      localStorage.setItem('bangmio_oauth_flow', flow)
      localStorage.setItem('bangmio_oauth_redirect', redirect)
      window.location.assign(url)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '无法开始 Bangumi 授权')
      setBusy(false)
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) { setMessage('请先完成人机验证'); return }
    setBusy(true)
    setMessage('')
    try {
      const normalizedEmail = email.trim()
      const normalizedCode = code.trim()
      const normalizedBangumiToken = bangumiToken.trim()
      if (currentMode === 'login') {
        const response = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail, password, captchaToken })
        })
        const payload = await response.json().catch(() => ({})) as ApiResult<{ token: string; user: User }>
        if (!response.ok || !payload.data?.token || !payload.data.user) throw new Error(errorMessage(payload, '登录失败'))
        setAuth(payload.data.token, payload.data.user)
        if (payload.data.user.bgmUid) {
          await fetchBgmToken()
          await fetchBgmUserProfile()
        }
        router.replace(redirect)
        router.refresh()
        return
      }
      if (currentMode === 'register') {
        const response = await fetch('/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail, password, code: normalizedCode, captchaToken })
        })
        const payload = await response.json().catch(() => ({})) as ApiResult<{ token: string; user: User }>
        if (!response.ok || !payload.data?.token || !payload.data.user) throw new Error(errorMessage(payload, '注册失败'))
        setAuth(payload.data.token, payload.data.user)
        router.replace('/bind-bangumi')
        router.refresh()
        return
      }
      if (currentMode === 'bind') {
        if (!isBangmioUser || !token) throw new Error('请先使用 Bangmio 账号登录')
        const response = await fetch('/api/v1/auth/bind-bangumi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ bangumiToken: normalizedBangumiToken })
        })
        const payload = await response.json().catch(() => ({})) as ApiResult<{ token: string; user: User }>
        if (!response.ok || !payload.data?.token || !payload.data.user) throw new Error(errorMessage(payload, '绑定失败'))
        setAuth(payload.data.token, payload.data.user)
        localStorage.setItem('bgm_token_cached', normalizedBangumiToken)
        await fetchBgmUserProfile()
        router.replace('/profile')
        router.refresh()
        return
      }
      const response = await fetch('/api/v1/user/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: normalizedBangumiToken })
      })
      const payload = await response.json().catch(() => ({})) as ApiResult<{ token: string; user: User }>
      if (!response.ok || !payload.data?.user) throw new Error(errorMessage(payload, 'Token 验证失败'))
      setAuth(payload.data.token || normalizedBangumiToken, payload.data.user, 'bangumi')
      router.replace(redirect)
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败')
    } finally {
      setBusy(false)
      if (!isBangumi) resetCaptcha()
    }
  }

  const title = currentMode === 'register'
    ? '创建 Bangmio 账号'
    : currentMode === 'bind'
      ? '绑定 Bangumi 账号'
      : currentMode === 'bangumi'
        ? '使用 Bangumi 登录'
        : '欢迎回来'
  const description = currentMode === 'register'
    ? '注册后可跨设备同步收藏、追番进度与社区内容。'
    : currentMode === 'bind'
      ? '连接 Bangumi 后即可同步收藏状态和个人资料。'
      : currentMode === 'bangumi'
        ? '通过官方 OAuth 授权，或使用 Access Token 登录。'
        : '登录 Bangmio，继续你的追番记录。'
  const action = currentMode === 'register' ? 'register' : 'login'

  return <div className="bm-auth-page">
    <AuthBrand />
    <div className="bm-auth-layout">
      <section className="bm-auth-intro" aria-label="Bangmio 功能介绍">
        <span className="bm-auth-eyebrow">YOUR ANIME COMPANION</span>
        <h1>把喜欢的番剧，<br />整理成自己的世界。</h1>
        <p>聚合 Bangumi 条目资料、收藏进度与社区讨论。界面更轻，信息更清楚。</p>
        <div className="bm-auth-points">
          <span><i>01</i> 多来源番剧资料</span>
          <span><i>02</i> 收藏与进度同步</span>
          <span><i>03</i> 小组交流与 AI 助手</span>
        </div>
      </section>

      <section className="bm-auth-card">
        <header className="bm-auth-card-head">
          <span className="bm-auth-mobile-mark"><img src="/logo.png" alt="" /></span>
          <div><span className="bm-auth-eyebrow">ACCOUNT</span><h2>{title}</h2><p>{description}</p></div>
        </header>

        {showLoginTabs ? <div className="bm-auth-tabs" role="tablist" aria-label="登录方式">
          <button type="button" role="tab" aria-selected={!isBangumi} className={!isBangumi ? 'is-active' : ''} onClick={() => router.replace(`/login${redirect === '/' ? '' : `?redirect=${encodeURIComponent(redirect)}`}`)}>Bangmio 账号</button>
          <button type="button" role="tab" aria-selected={isBangumi} className={isBangumi ? 'is-active' : ''} onClick={() => router.replace(`/login?mode=bangumi${redirect === '/' ? '' : `&redirect=${encodeURIComponent(redirect)}`}`)}>Bangumi 直登</button>
        </div> : null}

        {message ? <div className="bm-auth-message" role="status">{message}</div> : null}

        {!isBangumi ? <form className="bm-auth-form" onSubmit={submit}>
          <label className="bm-field"><span>邮箱</span><input className="bm-input" value={email} onChange={event => setEmail(event.target.value)} type="email" placeholder="you@example.com" autoComplete="email" required /></label>
          <label className="bm-field"><span>密码</span><input className="bm-input" value={password} onChange={event => setPassword(event.target.value)} type="password" placeholder="至少 8 位" autoComplete={currentMode === 'register' ? 'new-password' : 'current-password'} minLength={8} required /></label>
          {currentMode === 'login' ? <div className="bm-auth-inline-link"><Link href="/forgot-password">忘记密码？</Link></div> : null}
          {currentMode === 'register' ? <label className="bm-field"><span>邮箱验证码</span><div className="bm-code-row"><input className="bm-input" value={code} onChange={event => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="输入验证码" required /><button className="bm-secondary-button" type="button" disabled={busy || seconds > 0 || !canSubmit} onClick={sendCode}>{seconds > 0 ? `${seconds}s` : codeSent ? '重新发送' : '发送验证码'}</button></div></label> : null}
          {needsCaptcha && turnstile.siteKey ? <TurnstileWidget siteKey={turnstile.siteKey} action={action} resetSignal={captchaResetSignal} onVerify={value => { setCaptchaToken(value); setMessage('') }} onError={captchaError} /> : null}
          <button type="submit" disabled={busy || !canSubmit} className="bm-primary-button">{busy ? '处理中…' : currentMode === 'register' ? '注册并继续' : '登录'}</button>
        </form> : <div className="bm-auth-form">
          <button disabled={busy} className="bm-bangumi-button" type="button" onClick={() => void openOAuth(currentMode === 'bind' ? 'bind' : 'login')}><span>bgm</span>{busy ? '正在跳转…' : currentMode === 'bind' ? '通过 Bangumi OAuth 绑定' : '通过 Bangumi OAuth 登录'}</button>
          <div className="bm-auth-divider"><span>{currentMode === 'bind' ? '或使用 Access Token 绑定' : '或使用 Access Token 登录'}</span></div>
          <form className="bm-auth-form bm-auth-nested-form" onSubmit={submit}>
            <label className="bm-field"><span>Bangumi Access Token</span><input className="bm-input" value={bangumiToken} onChange={event => setBangumiToken(event.target.value)} type="password" autoComplete="off" placeholder="粘贴 Token" required /></label>
            <button type="submit" disabled={busy || !bangumiToken.trim()} className="bm-primary-button">{busy ? (currentMode === 'bind' ? '绑定中…' : '验证中…') : currentMode === 'bind' ? '立即绑定' : 'Token 登录'}</button>
          </form>
          <p className="bm-auth-note">可前往 <a href="https://next.bgm.tv/demo/access-token" target="_blank" rel="noreferrer">Bangumi Access Token 页面</a> 获取 Token。Token 仅用于验证和同步。</p>
        </div>}

        <footer className="bm-auth-footer">
          {currentMode === 'login' && !isBangumi ? <span>还没有账号？ <Link href="/register">立即注册</Link></span> : null}
          {currentMode === 'register' ? <span>已有账号？ <Link href="/login">返回登录</Link></span> : null}
          {currentMode === 'bind' ? <span><Link href="/">暂时跳过，返回首页</Link></span> : null}
          {currentMode === 'bangumi' ? <span>没有 Token？优先使用上方 OAuth 安全授权。</span> : null}
        </footer>
      </section>
    </div>
  </div>
}
