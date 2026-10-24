import Link from 'next/link'

export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  action
}: {
  eyebrow?: string
  title: string
  description?: string
  href?: string
  action?: string
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {href && action ? (
        <Link className="text-link" href={href}>
          {action} →
        </Link>
      ) : null}
    </div>
  )
}

export function EmptyState({
  title = '这里暂时没有内容',
  description = '换个条件再试试吧。'
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="bm-card text-center py-12">
      <div className="text-4xl mb-4 text-[var(--bm-muted)]">✦</div>
      <h3 className="text-base font-semibold text-[var(--bm-text)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--bm-muted)]">{description}</p>
    </div>
  )
}

export function ErrorState({ message = '数据加载失败，请稍后重试。' }: { message?: string }) {
  return (
    <div className="bm-card">
      <div
        className="rounded-xl p-4 border border-red-200 bg-red-50"
        style={{
          borderColor: 'var(--bm-line)',
          background: 'var(--bm-primary-soft)'
        }}
      >
        <strong className="block text-sm font-semibold mb-1 text-red-800">出了点问题</strong>
        <span className="text-sm text-red-600">{message}</span>
      </div>
    </div>
  )
}

export function LoadingGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="card-grid">
      {Array.from({ length: count }).map((_, index) => (
        <div className="skeleton-card" key={index}>
          <div className="skeleton-cover" />
          <div className="skeleton-line" />
          <div className="skeleton-line short" />
        </div>
      ))}
    </div>
  )
}
