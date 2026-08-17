'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ApiResult } from '@/lib/types'

export function PasswordRecoveryForm({ reset = false }: { reset?: boolean }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      const endpoint = reset ? '/api/v1/auth/reset-password' : '/api/v1/auth/forgot-password'
      const body = reset ? { email, code, newPassword: password } : { email }
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const payload = await response.json().catch(() => ({})) as ApiResult<{ success?: boolean }>
      if (!response.ok) throw new Error(payload.error || '操作失败')
      if (reset) { router.replace('/login'); return }
      setMessage('如果该邮箱已注册，重置验证码已发送。请在下方页面输入验证码并设置新密码。')
    } catch (error) { setMessage(error instanceof Error ? error.message : '操作失败') } finally { setBusy(false) }
  }
  return <div className="panel form-card"><div className="eyebrow">Account recovery</div><h1>{reset ? '设置新密码' : '找回密码'}</h1><p>{reset ? '输入邮箱、验证码与新密码完成重置。' : '输入注册邮箱。为保护账号，页面不会提示这个邮箱是否已注册。'}</p><form className="form-stack" onSubmit={submit}><label>邮箱<input className="input" type="email" value={email} onChange={event => setEmail(event.target.value)} required placeholder="you@example.com" /></label>{reset ? <><label>验证码<input className="input" value={code} onChange={event => setCode(event.target.value)} required /></label><label>新密码<input className="input" type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={8} placeholder="至少 8 位" /></label></> : null}<button className="button primary" type="submit" disabled={busy}>{busy ? '处理中…' : reset ? '确认修改' : '发送重置验证码'}</button></form>{message ? <div className="form-message success-message">{message}</div> : null}<div className="form-footer">{reset ? <Link href="/login">返回登录</Link> : <Link href="/reset-password">我已有验证码，去重置密码</Link>}</div></div>
}
