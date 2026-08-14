/**
 * Bangumi person career 字段到中文标签的映射。
 * 原为 Detail.vue 内联函数,拆 Tab 组件后由 TabOverview / TabStaff 共用。
 * @param {string} c - Bangumi career 字段
 * @returns {string} 中文标签(未知时原样返回)
 */
export function cvtCareer(c) {
  const map = {
    producer: '制作',
    mangaka: '漫画家',
    artist: '美术',
    seiyu: '声优',
    writer: '剧本',
    illustrator: '插画',
    actor: '演员'
  }
  return map[c] || c || ''
}
