import Link from 'next/link'

export default function AnimeNotFound() {
  return (
    <div className="panel empty-state" data-bangmio-cache="public">
      <div className="empty-icon">404</div>
      <h1>页面没有找到</h1>
      <p>该条目不存在或已被删除。</p>
      <Link className="button primary" href="/anime">
        浏览条目
      </Link>
    </div>
  )
}
