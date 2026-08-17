import Link from 'next/link'

export function SectionHeading({ eyebrow, title, description, href, action }: { eyebrow?: string; title: string; description?: string; href?: string; action?: string }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {href && action ? <Link className="text-link" href={href}>{action} →</Link> : null}
    </div>
  )
}

export function EmptyState({ title = '这里暂时没有内容', description = '换个条件再试试吧。' }: { title?: string; description?: string }) {
  return <div className="empty-state"><div className="empty-icon">✦</div><h3>{title}</h3><p>{description}</p></div>
}

export function ErrorState({ message = '数据加载失败，请稍后重试。' }: { message?: string }) {
  return <div className="error-state"><strong>出了点问题</strong><span>{message}</span></div>
}

export function LoadingGrid({ count = 6 }: { count?: number }) {
  return <div className="card-grid">{Array.from({ length: count }).map((_, index) => <div className="skeleton-card" key={index}><div className="skeleton-cover" /><div className="skeleton-line" /><div className="skeleton-line short" /></div>)}</div>
}
