/**
 * Profile 子组件冒烟/逻辑测试
 * 环境:jsdom(vitest.config.js environmentMatchGlobs 覆盖 client/src/components/**)
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ProfileStatsPanel from './ProfileStatsPanel.vue'
import ProfileTimelineCard from './ProfileTimelineCard.vue'

const routerLinkStub = {
  template: '<a class="router-link-stub" :to="to"><slot /></a>',
  props: ['to']
}

describe('ProfileStatsPanel / 统计逻辑', () => {
  const collections = [
    { type: 2, rate: 10, subject_type: 2 }, // 动画 完成 10分
    { type: 2, rate: 8, subject_type: 2 }, // 动画 完成 8分
    { type: 3, rate: 6, subject_type: 4 }, // 游戏 在看 6分
    { type: 1, subject_type: 2 } // 动画 想看 未评分
  ]

  it('全部:总数/完成数/完成率/平均分/评分数', () => {
    const w = mount(ProfileStatsPanel, { props: { collections } })
    expect(w.text()).toContain('收藏数')
    expect(w.vm.computedStats.total).toBe(4)
    expect(w.vm.computedStats.completed).toBe(2)
    expect(w.vm.computedStats.completionRate).toBe(50)
    expect(w.vm.computedStats.avg).toBe('8.0')
    expect(w.vm.computedStats.rateTotal).toBe(3)
  })

  it('按类型筛选(动画=2)', async () => {
    const w = mount(ProfileStatsPanel, { props: { collections } })
    await w
      .findAll('button')
      .find(b => b.text() === '动画')
      .trigger('click')
    expect(w.vm.computedStats.total).toBe(3)
    expect(w.vm.computedStats.rateTotal).toBe(2)
  })

  it('无评分时显示空状态', () => {
    const w = mount(ProfileStatsPanel, { props: { collections: [] } })
    expect(w.vm.computedStats.total).toBe(0)
    expect(w.text()).toContain('暂无评分数据')
  })
})

describe('ProfileTimelineCard / 时间胶囊', () => {
  it('渲染时间线条目与相对时间', () => {
    const now = new Date()
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
    const w = mount(ProfileTimelineCard, {
      props: {
        username: 'demo',
        timeline: [
          {
            type: '收藏',
            subject_name: '某番剧',
            subject_id: 123,
            time: fiveMinAgo
          }
        ]
      },
      global: { stubs: { 'router-link': routerLinkStub } }
    })
    expect(w.text()).toContain('某番剧')
    expect(w.text()).toContain('收藏')
    expect(w.text()).toContain('分钟前')
    expect(w.find('.router-link-stub').attributes('to')).toBe('/anime/123')
  })

  it('空时间线显示占位文案', () => {
    const w = mount(ProfileTimelineCard, {
      props: { username: 'demo', timeline: [] },
      global: { stubs: { 'router-link': routerLinkStub } }
    })
    expect(w.text()).toContain('还没有时间胶囊')
  })
})
