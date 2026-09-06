import { describe, expect, it } from 'vitest'
import { communityProfile, groupTopicView } from './community'

describe('communityProfile', () => {
  it('prefers a useful user profile when creator is an empty placeholder', () => {
    expect(
      communityProfile({
        creator: {},
        user: { nickname: '小明', username: 'xiaoming', avatar: { large: '/avatar.jpg' } }
      })
    ).toEqual({
      name: '小明',
      username: 'xiaoming',
      avatar: '/avatar.jpg',
      url: ''
    })
  })

  it('does not replace a string user with the generic community label', () => {
    expect(communityProfile({ user: 'alice' })).toMatchObject({ name: 'alice', username: 'alice' })
  })

  it('prefers the real user over a generic creator placeholder', () => {
    expect(
      communityProfile({
        creator: { nickname: '社区成员' },
        user: { nickname: '真实昵称', username: 'real-user', avatar: { large: '/real.jpg' } }
      })
    ).toEqual({ name: '真实昵称', username: 'real-user', avatar: '/real.jpg', url: '' })
  })

  it('falls back to the username when the displayed name is generic', () => {
    expect(
      communityProfile({ creator: { nickname: '社区成员', username: 'alice' } })
    ).toMatchObject({ name: 'alice', username: 'alice' })
  })
})

it('renders an explicit opening post as the body without duplicating it in replies', () => {
  const opening = { id: 't-1', content: '楼主正文', timestamp: '2026-09-05' }
  const reply = { id: 't-2', content: '回复' }
  const source = { title: '话题', main_post: opening, replies: [opening, reply] }
  const view = groupTopicView(source)
  expect(view.topic).toMatchObject({ content: '楼主正文', timestamp: '2026-09-05' })
  expect(view.replies).toEqual([reply])
  expect(source.replies).toHaveLength(2)
})
it('does not assume the first reply is the opening post when upstream omits it', () => {
  const source = { replies: [{ id: 't-2', content: '回复' }] }
  expect(groupTopicView(source)).toEqual({ topic: source, replies: source.replies })
})

it('缺少 main_post 时从一楼回复恢复主楼正文', () => {
  const opening = { id: 'topic-1', floor: '1', content: '首帖正文', timestamp: '刚刚' }
  const reply = { id: 'topic-2', floor: '2', content: '回复正文' }
  const view = groupTopicView({ title: '话题', replies: [opening, reply] })
  expect(view.topic.content).toBe('首帖正文')
  expect(view.replies).toEqual([reply])
})
