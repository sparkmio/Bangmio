import { describe, expect, it } from 'vitest'
import { DETAIL_TABS, detailTabFrom, isDetailTab } from './detail-tabs'

describe('detail tabs', () => {
  it('matches the labels the detail page used to render in its tab bar', () => {
    expect(DETAIL_TABS.map(([, label]) => label)).toEqual([
      '概览',
      '章节',
      '角色',
      '制作人员',
      '关联',
      '其他评分',
      '音乐',
      '在线观看',
      'Wiki',
      '吐槽',
      '讨论版'
    ])
  })
  it('accepts known tabs and falls back to overview for anything else', () => {
    expect(isDetailTab('episodes')).toBe(true)
    expect(isDetailTab('nope')).toBe(false)
    expect(detailTabFrom('music')).toBe('music')
    expect(detailTabFrom('nope')).toBe('overview')
    expect(detailTabFrom(null)).toBe('overview')
    expect(detailTabFrom(undefined)).toBe('overview')
  })
})
