import Link from 'next/link'
import { AnimeGrid } from '@/components/anime-card'
import { SectionHeading } from '@/components/ui'
import { safeApiFetch } from '@/lib/api'
import type { Subject } from '@/lib/types'

export const revalidate = 300

export default async function HomePage() {
  const [hot, calendar] = await Promise.all([
    safeApiFetch<Subject[]>('/anime/browse?sort=heat&type=2&limit=12'),
    safeApiFetch<Subject[]>('/anime/calendar')
  ])
  const hotList = Array.isArray(hot?.data) ? hot.data : []
  const calendarList = Array.isArray(calendar?.data) ? calendar.data : []
  return <>
    <section className="hero">
      <div>
        <div className="eyebrow">A calmer way to follow anime</div>
        <h1>把喜欢的番，<span>好好记下来。</span></h1>
        <p>发现新番、整理收藏、记录进度，也和同好聊聊每一集的感受。Bangmio 把分散的追番记录，整理成属于你的番组空间。</p>
        <div className="hero-actions"><Link className="button primary" href="/anime">开始找番</Link><Link className="button ghost" href="/groups">看看小组</Link></div>
      </div>
      <div className="hero-orbit" aria-hidden="true"><div className="orbit-core">B</div></div>
    </section>
    <section>
      <SectionHeading eyebrow="Community pulse" title="大家最近在看什么" description="根据 Bangumi 热度整理的条目。" href="/trending" action="查看趋势" />
      <AnimeGrid subjects={hotList} empty="暂时没有热门条目" />
    </section>
    <section>
      <SectionHeading eyebrow="Weekly calendar" title="本周放送" description="按放送日快速找到正在更新的作品。" />
      {calendarList.length ? <div className="list-grid">{calendarList.slice(0, 10).map((item: any) => { const subject = item.subject || item; return <Link className="list-card" href={`/anime/${subject.id}`} key={subject.id}><img className="list-cover" src={subject.images?.medium || subject.images?.common || ''} alt="" /><div><h3>{subject.name_cn || subject.name}</h3><p>{item.weekday?.en || item.weekday?.cn || subject.date || '近期放送'}</p></div></Link> })}</div> : <div className="panel empty-state"><h3>放送日历暂时不可用</h3><p>稍后刷新，或者直接去搜索条目。</p></div>}
    </section>
    <section>
      <SectionHeading title="一个更舒服的番组空间" description="从发现到记录，每一步都保持简单。" />
      <div className="feature-grid"><div className="panel feature"><div className="feature-icon">✦</div><h3>找到值得看的</h3><p>用热度、标签和日历快速探索作品，不再在信息流里迷路。</p></div><div className="panel feature"><div className="feature-icon">◌</div><h3>状态一目了然</h3><p>想看、在看、看过、搁置和抛弃，状态含义和 Bangumi 保持一致。</p></div><div className="panel feature"><div className="feature-icon">⌁</div><h3>和同好聊起来</h3><p>在条目、小组和话题里留下你的观点，把追番变成持续的社区体验。</p></div></div>
    </section>
  </>
}
