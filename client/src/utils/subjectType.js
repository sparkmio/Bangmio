/**
 * Bangumi 条目类型与收藏状态用语映射工具
 * @see https://bangumi.github.io/api/
 */

/**
 * Bangumi Subject type 映射
 * @type {Record<number, string>}
 */
export const SUBJECT_TYPE_NAMES = {
  1: '书籍',
  2: '动画',
  3: '音乐',
  4: '游戏',
  6: '三次元'
}

/**
 * 各条目类型对应的状态用语映射
 * Bangumi collection type: 1=wish, 2=collect, 3=do, 4=on_hold, 5=dropped
 * @type {Record<number, {wish:string,collect:string,do:string,on_hold:string,dropped:string}>}
 */
export const STATUS_LABELS_BY_TYPE = {
  1: { wish: '想读', collect: '在读', do: '读过', on_hold: '搁置', dropped: '抛弃' },
  2: { wish: '想看', collect: '在看', do: '看过', on_hold: '搁置', dropped: '抛弃' },
  3: { wish: '想听', collect: '在听', do: '听过', on_hold: '搁置', dropped: '抛弃' },
  4: { wish: '想玩', collect: '在玩', do: '玩过', on_hold: '搁置', dropped: '抛弃' },
  6: { wish: '想看', collect: '在看', do: '看过', on_hold: '搁置', dropped: '抛弃' }
}

// 默认动画用语
const DEFAULT_LABELS = STATUS_LABELS_BY_TYPE[2]

/**
 * 根据条目类型获取状态用语
 * @param {number} subjectType - Bangumi subject type (1=书籍, 2=动画, 3=音乐, 4=游戏, 6=三次元)
 * @returns {{wish:string,collect:string,do:string,on_hold:string,dropped:string}}
 */
export function getStatusLabels(subjectType) {
  return STATUS_LABELS_BY_TYPE[subjectType] || DEFAULT_LABELS
}

/**
 * 根据条目类型生成状态选项列表（用于下拉/菜单）
 * @param {number} subjectType - Bangumi subject type
 * @returns {{value:number,label:string}[]}
 */
export function getStatusOptions(subjectType) {
  const labels = getStatusLabels(subjectType)
  return [
    { value: 1, label: labels.wish },
    { value: 2, label: labels.collect },
    { value: 3, label: labels.do },
    { value: 4, label: labels.on_hold },
    { value: 5, label: labels.dropped }
  ]
}
