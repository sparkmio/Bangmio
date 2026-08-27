'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { ApiResult } from '@/lib/types'
import { TurnstileWidget } from './turnstile-widget'

type TurnstileConfig = { required: boolean; siteKey?: string | null }

export function PasswordRecoveryForm({ reset = false }: { reset?: boolean }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [turnstile, setTurnstile] = useState<TurnstileConfig>({ required: false })
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0)
  const needsCaptcha = !reset && turnstile.required
  const canSubmit = !needsCaptcha || Boolean(captchaToken)

  useEffect(() => {
    if (reset) return
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
  }, [reset])

  function resetCaptcha() {
    setCaptchaToken('')
    setCaptchaResetSignal(value => value + 1)
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) { setMessage('请先完成人机验证'); return }
    setBusy(true)
    setMessage('')
    try {
      const endpoint = reset ? '/api/v1/auth/reset-password' : '/api/v1/auth/forgot-password'
      const body = reset
        ? { email: email.trim(), code: code.trim(), newPassword: password }
        : { email: email.trim(), captchaToken }
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const payload = await response.json().catch(() => ({})) as ApiResult<{ success?: boolean }>
      if (!response.ok) throw new Error(payload.error || '操作失败')
      if (reset) {
        router.replace('/login')
        return
      }
      setMessage('如果该邮箱已注册，重置验证码已经发送。请检查收件箱和垃圾邮件。')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败')
    } finally {
      setBusy(false)
      if (!reset) resetCaptcha()
    }
  }

  return <div className="bm-auth-page">
    <Link className="bm-auth-brand" href="/" aria-label="返回 Bangmio 首页"><img src="/logo.png" alt="" /><span>Bangmio</span></Link>
    <section className="bm-auth-card bm-auth-card-single">
      <header className="bm-auth-card-head"><span className="bm-auth-mobile-mark"><img src="/logo.png" alt="" /></span><div><span className="bm-auth-eyebrow">ACCOUNT RECOVERY</span><h1>{reset ? '设置新密码' : '找回密码'}</h1><p>{reset ? '输入邮箱、验证码与新密码完成重置。' : '输入注册邮箱。为保护账号，我们不会显示该邮箱是否存在。'}</p></div></header>
      {message ? <div className="bm-auth-message" role="status">{message}</div> : null}
      <form className="bm-auth-form" onSubmit={submit}>
        <label className="bm-field"><span>邮箱</span><input className="bm-input" type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" placeholder="you@example.com" /></label>
        {reset ? <>
          <label className="bm-field"><span>验证码</span><input className="bm-input" value={code} onChange={event => setCode(event.target.value)} required inputMode="numeric" autoComplete="one-time-code" placeholder="输入邮箱验证码" /></label>
          <label className="bm-field"><span>新密码</span><input className="bm-input" type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={8} autoComplete="new-password" placeholder="至少 8 位" /></label>
        </> : needsCaptcha && turnstile.siteKey ? <TurnstileWidget siteKey={turnstile.siteKey} action="reset_password" resetSignal={captchaResetSignal} onVerify={value => { setCaptchaToken(value); setMessage('') }} onError={text => { setCaptchaToken(''); setMessage(text) }} /> : null}
        <button className="bm-primary-button" type="submit" disabled={busy || !canSubmit}>{busy ? '处理中…' : reset ? '确认修改' : '发送重置验证码'}</button>
      </form>
      <footer className="bm-auth-footer">{reset ? <Link href="/login">返回登录</Link> : <Link href="/reset-password">已有验证码，设置新密码</Link>}</footer>
    </section>
  </div>
}
