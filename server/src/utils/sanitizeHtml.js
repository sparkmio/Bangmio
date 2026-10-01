/**
 * 外部 HTML 代理的统一安全清洗工具。
 *
 * 这些页面最终会进入 iframe[srcDoc]，即使 iframe 当前禁用了脚本，也不能把
 * javascript: 链接、事件处理器或可执行嵌入内容透传给浏览器。
 */

const DROP_TAGS = new Set([
  'base',
  'embed',
  'form',
  'iframe',
  'input',
  'link',
  'meta',
  'object',
  'script',
  'select',
  'style',
  'textarea',
  'template'
])

const SAFE_ATTRIBUTES = new Set([
  'alt',
  'aria-label',
  'aria-hidden',
  'class',
  'colspan',
  'dir',
  'height',
  'id',
  'lang',
  'loading',
  'name',
  'rowspan',
  'role',
  'target',
  'title',
  'width'
])

const SAFE_HREF_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])
const SAFE_RESOURCE_PROTOCOLS = new Set(['http:', 'https:'])
const SAFE_DATA_IMAGE = /^data:image\/(?:gif|jpe?g|png|webp|avif);/i

function safeAbsoluteUrl(value, baseUrl, { resource = false } = {}) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw.startsWith('#')) return raw
  if (/^data:/i.test(raw)) return !resource || !SAFE_DATA_IMAGE.test(raw) ? '' : raw

  try {
    const url = new URL(raw, baseUrl)
    const protocols = resource ? SAFE_RESOURCE_PROTOCOLS : SAFE_HREF_PROTOCOLS
    return protocols.has(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

function setSafeLinkAttributes(element) {
  if (element.tagName?.toLowerCase() !== 'a') return
  const target = element.getAttribute('target')
  if (target && target.toLowerCase() === '_blank') {
    const rel = new Set((element.getAttribute('rel') || '').split(/\s+/).filter(Boolean))
    rel.add('noopener')
    rel.add('noreferrer')
    element.setAttribute('rel', [...rel].join(' '))
  }
}

/**
 * 清洗 linkedom document，并将允许的 URL 解析为绝对地址。
 * @param {Document} document
 * @param {{ baseUrl: string, removeSelectors?: string[] }} options
 */
export function sanitizeExternalDocument(document, { baseUrl, removeSelectors = [] }) {
  for (const selector of removeSelectors) {
    document.querySelectorAll(selector).forEach(element => element.remove())
  }

  document.querySelectorAll('*').forEach(element => {
    const tagName = element.tagName?.toLowerCase() || ''
    if (DROP_TAGS.has(tagName)) {
      element.remove()
      return
    }

    for (const attribute of Array.from(element.attributes || [])) {
      const name = attribute.name.toLowerCase()
      const value = attribute.value

      if (name.startsWith('on') || name === 'srcdoc' || name === 'style' || name === 'srcset') {
        element.removeAttribute(attribute.name)
        continue
      }

      if (name === 'href') {
        const safe = safeAbsoluteUrl(value, baseUrl)
        if (safe) element.setAttribute(attribute.name, safe)
        else element.removeAttribute(attribute.name)
        continue
      }

      if (name === 'src' || name === 'poster') {
        const safe = safeAbsoluteUrl(value, baseUrl, { resource: true })
        if (safe) element.setAttribute(attribute.name, safe)
        else element.removeAttribute(attribute.name)
        continue
      }

      if (!SAFE_ATTRIBUTES.has(name) && !name.startsWith('aria-')) {
        element.removeAttribute(attribute.name)
      }
    }

    setSafeLinkAttributes(element)
  })

  return document
}
