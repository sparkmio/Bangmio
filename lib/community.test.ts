import { describe, expect, it } from 'vitest'
import { communityProfile } from './community'

describe('communityProfile', () => {
  it('prefers a useful user profile when creator is an empty placeholder', () => {
    expect(communityProfile({ creator: {}, user: { nickname: '小明', username: 'xiaoming', avatar: { large: '/avatar.jpg' } } })).toEqual({
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
    expect(communityProfile({
      creator: { nickname: '社区成员' },
      user: { nickname: '真实昵称', username: 'real-user', avatar: { large: '/real.jpg' } }
    })).toEqual({ name: '真实昵称', username: 'real-user', avatar: '/real.jpg', url: '' })
  })

  it('falls back to the username when the displayed name is generic', () => {
    expect(communityProfile({ creator: { nickname: '社区成员', username: 'alice' } }))
      .toMatchObject({ name: 'alice', username: 'alice' })
  })
})
