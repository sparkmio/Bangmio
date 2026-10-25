/**
 * 动态 SEO / 社交分享 meta 管理（PROJECT_ISSUES 4.4）。
 *
 * 番剧详情页等场景下按当前条目覆盖 title / og:* / twitter:*，
 * 组件卸载时调用 resetPageMeta() 恢复站点默认值。
 */
const SITE_NAME = 'Bangmio'
const SITE_URL = 'https://bangmio.site'
const DEFAULT_IMAGE = `${SITE_URL}/logo.png`
const DEFAULT_TITLE = `${SITE_NAME} - 一站式追番社区`
const DEFAULT_DESCRIPTION = '聚合 Bangumi、豆瓣、B站、萌娘百科多平台数据的一站式追番社区'

function upsertMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content || '')
}

/**
 * 设置当前页面 meta。
 * @param {{ title?: string, description?: string, image?: string, url?: string }} [opts]
 * 未提供的字段使用站点默认值。
 */
export function setPageMeta({ title = '', description = '', image = '', url = '' } = {}) {
  const fullTitle = title ? `${title} - ${SITE_NAME}` : DEFAULT_TITLE
  const desc = description || DEFAULT_DESCRIPTION
  const img = image || DEFAULT_IMAGE
  const pageUrl = url || SITE_URL

  document.title = title || SITE_NAME

  upsertMeta('property', 'og:title', fullTitle)
  upsertMeta('property', 'og:description', desc)
  upsertMeta('property', 'og:image', img)
  upsertMeta('property', 'og:url', pageUrl)

  upsertMeta('name', 'twitter:title', fullTitle)
  upsertMeta('name', 'twitter:description', desc)
  upsertMeta('name', 'twitter:image', img)

  upsertMeta('name', 'description', desc)
}

/** 恢复站点默认 meta（路由离开时调用）。 */
export function resetPageMeta() {
  setPageMeta()
}
