/** Capture at send time, never during rendering. Only public detail routes are eligible. */
export function pageContext(extra?: string) {
  if (typeof document === 'undefined') return ''
  if (!/^\/(anime|person|character)\/\d+\/?$/.test(window.location.pathname)) return ''
  const root = document.querySelector('main')
  if (!root) return ''
  const clone = root.cloneNode(true) as HTMLElement
  clone
    .querySelectorAll(
      'input, textarea, select, button, script, style, nav, [hidden], [aria-hidden="true"], [data-ai-private], .bm-collection-editor, .bm-ai-panel'
    )
    .forEach(node => node.remove())
  const text = (clone.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 6000)
  return [
    `页面标题：${document.title}`,
    `地址：${window.location.pathname}`,
    extra ? `条目资料：${extra}` : '',
    `页面可见内容：${text}`
  ]
    .filter(Boolean)
    .join('\n')
}
