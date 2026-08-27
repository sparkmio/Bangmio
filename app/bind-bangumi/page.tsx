import { AuthForm } from '@/components/auth-form'
import { Suspense } from 'react'

export default function BindBangumiPage() {
  return <Suspense fallback={<div className="bm-auth-loading">正在准备绑定…</div>}><AuthForm mode="bind" /></Suspense>
}
