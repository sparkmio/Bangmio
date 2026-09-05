import { afterEach, describe, expect, it } from 'vitest'
import { pageContext } from './ai-context'
afterEach(() => {
  document.body.innerHTML = ''
  window.history.replaceState(null, '', '/')
})
describe('AI page context', () => {
  it('reads the latest tab content, excluding collection data and forms', () => {
    window.history.replaceState(null, '', '/anime/1')
    document.body.innerHTML =
      '<main><h1>公开条目</h1><div id="tab">简介</div><section data-ai-private>我的评分和短评</section><input value="secret"></main>'
    expect(pageContext()).toContain('简介')
    document.querySelector('#tab')!.textContent = '角色列表'
    expect(pageContext()).toContain('角色列表')
    expect(pageContext()).not.toContain('简介')
    expect(pageContext()).not.toContain('我的评分')
    expect(pageContext()).not.toContain('secret')
  })
  it.each(['/settings', '/profile', '/', '/login', '/anime/1/talkbox'])(
    'does not capture private/list routes %s',
    path => {
      window.history.replaceState(null, '', path)
      document.body.innerHTML = '<main>private info</main>'
      expect(pageContext()).toBe('')
    }
  )
})
