import { describe, expect, it } from 'vitest'
import { parseHTML } from 'linkedom'
import {
  commentSubmissionAccepted,
  extractFormhash,
  parseUserLink,
  parseTopicPage
} from './comments.js'

describe('comment form helpers', () => {
  it('extracts formhash regardless of attribute order and quote style', () => {
    expect(extractFormhash('<input value="abc123" name="formhash">')).toBe('abc123')
    expect(extractFormhash("<input name='formhash' value='xyz789'>")).toBe('xyz789')
    expect(
      extractFormhash('<input name="other" value="nope"><input name="formhash" value="ok">')
    ).toBe('ok')
    expect(extractFormhash('<input name="formhash">')).toBeNull()
  })

  it('only accepts redirects that are not authentication redirects', () => {
    expect(commentSubmissionAccepted({ status: 302, ok: false }, '', '/subject/42/talkbox')).toBe(
      true
    )
    expect(
      commentSubmissionAccepted({ status: 302, ok: false }, '', '/login?from=/subject/42')
    ).toBe(false)
    expect(commentSubmissionAccepted({ status: 302, ok: false }, '', '')).toBe(false)
  })

  it('requires an explicit success message for a 2xx HTML response', () => {
    const response = { status: 200, ok: true }
    expect(commentSubmissionAccepted(response, '<html><form>请登录</form></html>', '')).toBe(false)
    expect(commentSubmissionAccepted(response, '<html><form>发表内容</form></html>', '')).toBe(
      false
    )
    expect(commentSubmissionAccepted(response, '<div>发表成功</div>', '')).toBe(true)
    expect(commentSubmissionAccepted(response, '<div>formhash 无效</div>', '')).toBe(false)
  })
})

describe('comment author parsing', () => {
  it('accepts absolute user profile links and keeps the real nickname/avatar', () => {
    const html =
      '<div class="postTopic"><a href="https://bangumi.pro/user/alice"><img src="//lain.bgm.tv/pic/user/l/000/00/01.jpg">爱丽丝</a><div class="topic_content"><div class="message">正文</div></div></div>'
    const topic = parseTopicPage(html)
    expect(topic.op.user.username).toBe('alice')
    expect(topic.op.user.nickname).toBe('爱丽丝')
    expect(topic.op.user.url).toBe('https://bangumi.pro/user/alice')
    expect(topic.op.user.avatar).toBe('https://lain.bangumi.pro/pic/user/l/000/00/01.jpg')
  })

  it('does not treat unrelated links as a community author', () => {
    const { document } = parseHTML('<div><a href="/subject/1">条目</a></div>')
    expect(parseUserLink(document)).toEqual({ username: '', nickname: '', url: '', avatar: '' })
  })
})
