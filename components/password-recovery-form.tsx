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
      .then(({ response, payload }) => { if (alive && response.ok && payload.data) setTurnstile(payload.data) })
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
    setBusy(true); setMessage('')
    try {
      const endpoint = reset ? '/api/v1/auth/reset-password' : '/api/v1/auth/forgot-password'
      const body = reset ? { email, code, newPassword: password } : { email, captchaToken }
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const payload = await response.json().catch(() => ({})) as ApiResult<{ success?: boolean }>
      if (!response.ok) throw new Error(payload.error || '操作失败')
      if (reset) { router.replace('/login'); return }
      setMessage('如果该邮箱已注册，重置验证码已发送。请在下方页面输入验证码并设置新密码。')
    } catch (error) { setMessage(error instanceof Error ? error.message : '操作失败') } finally { setBusy(false); if (!reset) resetCaptcha() }
  }
  return <div className="panel form-card"><div className="eyebrow">Account recovery</div><h1>{reset ? '设置新密码' : '找回密码'}</h1><p>{reset ? '输入邮箱、验证码与新密码完成重置。' : '输入注册邮箱。为保护账号，页面不会提示这个邮箱是否已注册。'}</p><form className="form-stack" onSubmit={submit}><label>邮箱<input className="bangmio-input" type="email" value={email} onChange={event => setEmail(event.target.value)} required placeholder="you@example.com" /></label>{reset ? <><label>验证码<input className="bangmio-input" value={code} onChange={event => setCode(event.target.value)} required /></label><label>新密码<input className="bangmio-input" type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={8} placeholder="至少 8 位" /></label></> : <><TurnstileWidget siteKey={turnstile.siteKey || undefined} action="reset_password" resetSignal={captchaResetSignal} onVerify={setCaptchaToken} onError={setMessage} />{needsCaptcha && !turnstile.siteKey ? <p className="text-xs text-error">人机验证配置缺失，请稍后再试。</p> : null}</>}<button className="button primary" type="submit" disabled={busy || !canSubmit || (needsCaptcha && !turnstile.siteKey)}>{busy ? '处理中…' : reset ? '确认修改' : '发送重置验证码'}</button></form>{message ? <div className="form-message success-message">{message}</div> : null}<div className="form-footer">{reset ? <Link href="/login">返回登录</Link> : <Link href="/reset-password">我已有验证码，去重置密码</Link>}</div></div>
}
