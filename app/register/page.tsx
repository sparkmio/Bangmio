import { AuthForm } from '@/components/auth-form'
import { Suspense } from 'react'

export default function RegisterPage() {
  return <Suspense fallback={<div className="bm-auth-loading">正在准备注册…</div>}><AuthForm mode="register" /></Suspense>
}
