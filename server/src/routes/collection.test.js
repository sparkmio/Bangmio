import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGet = vi.fn()
const mockVerifyUsername = vi.fn()

vi.mock('../services/bangumi.js', () => ({
  getClient: () => ({ get: mockGet })
}))

vi.mock('../services/userVerify.js', () => ({
  verifyBangumiUsername: (...args) => mockVerifyUsername(...args)
}))

const { default: collectionRoutes } = await import('./collection.js')

function collectionRequest(query) {
  return collectionRoutes.request(`http://localhost/list?${query}`, {
    headers: {
      Authorization: 'Bearer test-token',
      'X-Bangumi-Username': 'authenticated-user'
    }
  })
}

describe('collection routes', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockVerifyUsername.mockReset()
    mockVerifyUsername.mockResolvedValue(true)
    mockGet.mockResolvedValue({ data: [{ subject_id: 1 }], total: 1 })
  })

  it('accepts a type-only collection filter used by the watching page', async () => {
    const response = await collectionRequest('offset=0&limit=30&type=3')

    expect(response.status).toBe(200)
    expect(mockVerifyUsername).toHaveBeenCalledWith('test-token', 'authenticated-user', false)
    expect(mockGet).toHaveBeenCalledWith('/v0/users/authenticated-user/collections', {
      offset: 0,
      limit: 30,
      type: 3
    })
  })

  it('accepts a subject-type-only collection filter used by the profile page', async () => {
    const response = await collectionRequest('offset=0&limit=50&subject_type=2')

    expect(response.status).toBe(200)
    expect(mockGet).toHaveBeenCalledWith('/v0/users/authenticated-user/collections', {
      offset: 0,
      limit: 50,
      subject_type: 2
    })
  })

  it('does not turn an upstream stats failure into a false zero', async () => {
    mockGet.mockImplementation((path, params) => {
      if (path.includes('/collections') && params?.type)
        return Promise.reject(new Error('upstream unavailable'))
      return Promise.resolve({ data: [], total: 0 })
    })

    const response = await collectionRoutes.request('http://localhost/stats', {
      headers: {
        Authorization: 'Bearer test-token',
        'X-Bangumi-Username': 'authenticated-user'
      }
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: {
        want: null,
        completed: null,
        watching: null,
        on_hold: null,
        dropped: null,
        total: null
      }
    })
  })

  it('returns a total only when every collection status was read reliably', async () => {
    mockGet.mockImplementation((path, params) => {
      if (path.includes('/collections') && params?.type)
        return Promise.resolve({ total: params.type })
      return Promise.resolve({ data: [], total: 0 })
    })

    const response = await collectionRoutes.request('http://localhost/stats', {
      headers: {
        Authorization: 'Bearer test-token',
        'X-Bangumi-Username': 'authenticated-user'
      }
    })
    expect(await response.json()).toEqual({
      data: { want: 1, completed: 2, watching: 3, on_hold: 4, dropped: 5, total: 15 }
    })
  })
})
