/**
 * Profile 页拆分子组件后共享的展示辅助函数。
 * 原为 Profile.vue 内联函数,由 ProfileTimelineCard / ProfileStatsPanel 共用。
 */
import { getStatusLabels } from './subjectType'

/** 状态数字到中文标签(按 subject type 动态用语) */
export function statusLabel(s, subjectType = 2) {
  if (!s) return ''
  const labels = getStatusLabels(subjectType)
  const map = {
    1: labels.wish,
    2: labels.do,
    3: labels.collect,
    4: labels.on_hold,
    5: labels.dropped
  }
  return map[s] || ''
}

/** 状态数字到 badge 样式 */
export function statusBadgeClass(s) {
  return (
    {
      1: 'badge-info',
      2: 'badge-secondary',
      3: 'badge-success',
      4: 'badge-warning',
      5: 'badge-error'
    }[s] || 'badge-ghost'
  )
}

/** timeline 项类型标签:兼容字符串与数字 */
export function timelineTypeLabel(item) {
  if (typeof item.type === 'string' && item.type) return item.type
  const subjectType = item.subject?.type || item.subject_type || 2
  return statusLabel(item.type, subjectType)
}

/** timeline 项 badge 样式 */
export function timelineBadgeClass(item) {
  if (typeof item.type === 'number') return statusBadgeClass(item.type)
  const map = { 收藏: 'badge-info', 评论: 'badge-secondary', 进度: 'badge-success' }
  return map[item.type] || 'badge-ghost'
}

/** 相对时间格式化 */
export function formatRelativeTime(t) {
  if (!t) return ''
  try {
    const d = new Date(t)
    if (isNaN(d.getTime())) return ''
    const diff = (Date.now() - d.getTime()) / 1000
    if (diff < 60) return '刚刚'
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
    if (diff < 2592000) return `${Math.floor(diff / 86400)}天前`
    return `${d.getMonth() + 1}月${d.getDate()}日`
  } catch {
    return ''
  }
}

/** 评分条颜色:10-9 绿,8-7 青,6-5 黄,4-3 橙,2-1 红 */
export function rateBarClass(rate) {
  if (rate >= 9) return 'bg-emerald-500'
  if (rate >= 7) return 'bg-cyan-500'
  if (rate >= 5) return 'bg-yellow-400'
  if (rate >= 3) return 'bg-orange-500'
  return 'bg-red-500'
}
