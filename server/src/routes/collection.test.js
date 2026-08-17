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
})
