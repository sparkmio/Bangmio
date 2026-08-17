import Link from 'next/link'
import { AnimeGrid } from '@/components/anime-card'
import { SectionHeading } from '@/components/ui'
import { safeApiFetch } from '@/lib/api'
import type { Subject } from '@/lib/types'

export const revalidate = 300

type CalendarEntry = Subject & {
  subject?: Subject
  weekday?: { cn?: string; en?: string }
}

export default async function HomePage() {
  const [hot, calendar] = await Promise.all([
    safeApiFetch<Subject[]>('/anime/browse?sort=heat&type=2&limit=12'),
    safeApiFetch<CalendarEntry[]>('/anime/calendar')
  ])
  const hotList = Array.isArray(hot?.data) ? hot.data : []
  const calendarList = Array.isArray(calendar?.data) ? calendar.data : []

  return <>
    <section className="welcome-panel">
      <div>
        <div className="eyebrow">Bangmio 番组空间</div>
        <h1>今天也来看看喜欢的作品吧</h1>
        <p>找新番、记进度、逛小组。熟悉的 Bangmio，只是把页面结构重新整理得更清楚。</p>
      </div>
      <div className="welcome-actions">
        <Link className="button primary" href="/watching">查看在追</Link>
        <Link className="button ghost" href="/anime">搜索番组</Link>
      </div>
    </section>

    <section>
      <SectionHeading title="热门新番" description="大家最近关注的动画条目" href="/trending" action="查看全部" />
      <AnimeGrid subjects={hotList} empty="暂时没有热门条目" />
    </section>

    <section>
      <SectionHeading title="新番时间表" description="按放送日快速查看本周更新" href="/trending" action="完整时间表" />
      {calendarList.length ? <div className="schedule-grid">{calendarList.slice(0, 12).map((entry, index) => {
        const subject = entry.subject || entry
        return <Link className="schedule-item" href={`/anime/${subject.id}`} key={`${subject.id}-${index}`}>
          {subject.images?.medium || subject.images?.common ? <img src={subject.images.medium || subject.images.common} alt="" /> : <span className="schedule-placeholder">B</span>}
          <span className="schedule-copy"><strong>{subject.name_cn || subject.name}</strong><small>{entry.weekday?.cn || entry.weekday?.en || subject.date || '近期放送'}</small></span>
          <span className="schedule-arrow">›</span>
        </Link>
      })}</div> : <div className="panel empty-state"><h3>放送日历暂时不可用</h3><p>稍后刷新，或者直接去搜索条目。</p></div>}
    </section>

    <section>
      <SectionHeading title="在 Bangmio 可以做什么" />
      <div className="feature-grid">
        <Link className="panel feature" href="/watching"><span className="feature-icon">✓</span><div><h3>记录在追</h3><p>随时查看正在看的作品和当前进度。</p></div></Link>
        <Link className="panel feature" href="/anime"><span className="feature-icon">⌕</span><div><h3>发现作品</h3><p>从 Bangumi 条目中搜索下一部想看的番。</p></div></Link>
        <Link className="panel feature" href="/groups"><span className="feature-icon">#</span><div><h3>参与讨论</h3><p>浏览小组和话题，找到同好一起聊。</p></div></Link>
      </div>
    </section>
  </>
}
