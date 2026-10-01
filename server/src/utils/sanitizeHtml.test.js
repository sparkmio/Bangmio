import { describe, expect, it } from 'vitest'
import { parseHTML } from 'linkedom'
import { sanitizeExternalDocument } from './sanitizeHtml.js'

describe('sanitizeExternalDocument', () => {
  it('移除事件处理器、可执行标签和不安全 URL', () => {
    const { document } = parseHTML(`<div>
      <a href="javascript:alert(1)" onclick="alert(2)" style="color:red">bad</a>
      <img src="x" onerror="alert(3)" data-src="https://example.com/lazy.png">
      <iframe src="https://evil.example"></iframe>
      <form action="https://evil.example"><input name="q"></form>
    </div>`)

    sanitizeExternalDocument(document, { baseUrl: 'https://example.com/article' })
    const html = document.querySelector('div')?.innerHTML || ''

    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('onclick')
    expect(html).not.toContain('onerror')
    expect(html).not.toContain('style=')
    expect(html).not.toContain('<iframe')
    expect(html).not.toContain('<form')
    expect(html).not.toContain('<input')
  })

  it('保留安全链接与图片并转换相对地址', () => {
    const { document } = parseHTML(`<div>
      <a href="/wiki/test" target="_blank">wiki</a>
      <a href="mailto:test@example.com">mail</a>
      <img src="//cdn.example.test/a.png" alt="cover">
      <img src="data:image/png;base64,AAAA" alt="inline">
    </div>`)

    sanitizeExternalDocument(document, { baseUrl: 'https://example.com/article' })

    expect(document.querySelector('div')?.innerHTML || '').toContain(
      'href="https://example.com/wiki/test"'
    )
    expect(document.querySelector('div')?.innerHTML || '').toContain('rel="noopener noreferrer"')
    expect(document.querySelector('div')?.innerHTML || '').toContain(
      'href="mailto:test@example.com"'
    )
    expect(document.querySelector('div')?.innerHTML || '').toContain(
      'src="https://cdn.example.test/a.png"'
    )
    expect(document.querySelector('div')?.innerHTML || '').toContain(
      'src="data:image/png;base64,AAAA"'
    )

    const unsafeDataImage = parseHTML(
      `<img src="data:image/svg+xml,<svg onload=alert(1)>" />`
    ).document
    sanitizeExternalDocument(unsafeDataImage, { baseUrl: 'https://example.com/article' })
    expect(unsafeDataImage.querySelector('img')?.getAttribute('src')).toBeNull()
  })
})
