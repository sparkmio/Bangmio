import type { Metadata } from 'next'
import { AuthForm } from '@/components/auth-form'
import { Suspense } from 'react'

export const metadata: Metadata = { title: 'Bangumi 登录' }

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="bm-auth-loading">正在准备登录…</div>}>
      <AuthForm mode="bangumi" />
    </Suspense>
  )
}
