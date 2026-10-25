import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./index', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn()
  }
}))

import api from './index'
import { groupAPI } from './endpoints'

describe('groupAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requests the list route without a trailing slash', () => {
    const config = { signal: new AbortController().signal }

    groupAPI.getList(config)

    expect(api.get).toHaveBeenCalledWith('/groups', config)
  })

  it('requests all-group hot topics from the discover route', () => {
    groupAPI.getDiscover()

    expect(api.get).toHaveBeenCalledWith('/groups/discover', {})
  })

  it('requests a group topic detail through the internal group API', () => {
    groupAPI.getTopicDetail('123')

    expect(api.get).toHaveBeenCalledWith('/groups/topic/123', {})
  })
})
