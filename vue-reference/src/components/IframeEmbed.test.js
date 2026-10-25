import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import IframeEmbed from './IframeEmbed.vue'

let wrapper

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.unstubAllGlobals()
})

describe('IframeEmbed HTML 文档规范化', () => {
  it('完整 HTML 不会被嵌套进第二个 body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          '<!DOCTYPE html><html><head><title>词条</title></head><body><main>完整正文</main></body></html>',
          {
            status: 200
          }
        )
      )
    )

    wrapper = mount(IframeEmbed, { props: { src: '/api/moegirl/page/test' } })
    await flushPromises()

    const iframe = wrapper.find('iframe')
    expect(iframe.exists()).toBe(true)
    const srcdoc = iframe.element.srcdoc
    expect(srcdoc).toContain('<main>完整正文</main>')
    expect(srcdoc).not.toContain('<body>\n<!DOCTYPE html>')
    expect(srcdoc).toMatch(/<head[^>]*><meta name="viewport"/)
  })

  it('HTML 片段仍会包装为可独立渲染的文档', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<article>片段正文</article>')))

    wrapper = mount(IframeEmbed, { props: { src: '/api/fragment' } })
    await flushPromises()

    const srcdoc = wrapper.find('iframe').element.srcdoc
    expect(srcdoc).toContain('<!DOCTYPE html><html>')
    expect(srcdoc).toContain('<body><article>片段正文</article>')
  })
})
