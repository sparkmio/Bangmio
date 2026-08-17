import { AuthForm } from '@/components/auth-form'
import { Suspense } from 'react'
export default function LoginPage() { return <Suspense fallback={<div className="panel empty-state">正在准备登录…</div>}><AuthForm mode="login" /></Suspense> }
