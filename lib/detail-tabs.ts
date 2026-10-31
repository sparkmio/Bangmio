// 番剧详情页的板块（选项卡）定义，详情页正文和 Dock 共用同一份，避免两处维护走样。
export const DETAIL_TABS = [
  ['overview', '概览'],
  ['episodes', '章节'],
  ['characters', '角色'],
  ['staff', '制作人员'],
  ['relations', '关联'],
  ['douban', '其他评分'],
  ['music', '音乐'],
  ['streaming', '在线观看'],
  ['wiki', 'Wiki'],
  ['talkbox', '吐槽'],
  ['topics', '讨论版']
] as const

export type DetailTabKey = (typeof DETAIL_TABS)[number][0]

export function isDetailTab(value: string | null | undefined): value is DetailTabKey {
  return Boolean(value) && DETAIL_TABS.some(([key]) => key === value)
}

export function detailTabFrom(value: string | null | undefined): DetailTabKey {
  return isDetailTab(value) ? value : 'overview'
}
