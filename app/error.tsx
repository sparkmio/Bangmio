'use client'
import Link from 'next/link'
export default function PageError({
  retry
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  return (
    <section className="rounded-xl border border-base-300 bg-base-100 p-6" role="alert">
      <h1 className="text-xl font-semibold mb-3">页面暂时无法加载</h1>
      <p className="mb-4">服务暂时不可用，不代表条目不存在。请稍后重试。</p>
      <button className="btn btn-primary mr-3" type="button" onClick={retry}>
        重试
      </button>
      <Link href="/" className="link">
        返回首页
      </Link>
    </section>
  )
}
