import { describe, expect, it, vi } from 'vitest'
import { publishRelease } from './publish-release.mjs'

const options = { repository: 'sparkmio/Bangmio', tag: 'v4.3.0' }
const httpError = status =>
  Object.assign(new Error('GitHub API failed'), { stderr: `gh: failure (HTTP ${status})` })

describe('idempotent release publication', () => {
  it('preserves an existing release without writes', () => {
    const run = vi.fn().mockReturnValue('')
    expect(publishRelease(options, run)).toBe('existing')
    expect(run).toHaveBeenCalledTimes(1)
    expect(run.mock.calls[0][0]).toEqual([
      'api',
      'repos/sparkmio/Bangmio/releases/tags/v4.3.0',
      '--silent'
    ])
  })
  it('creates only after a confirmed 404 and verifies the tag', () => {
    const run = vi
      .fn()
      .mockImplementationOnce(() => {
        throw httpError(404)
      })
      .mockReturnValue('')
    expect(publishRelease(options, run)).toBe('created')
    expect(run.mock.calls[1][0]).toEqual([
      'release',
      'create',
      'v4.3.0',
      '--repo',
      'sparkmio/Bangmio',
      '--verify-tag',
      '--title',
      'Bangmio v4.3.0',
      '--notes-file',
      'release-notes.md'
    ])
  })
  it.each([401, 403, 429, 500])('does not write after lookup error %s', status => {
    const error = httpError(status)
    const run = vi.fn(() => {
      throw error
    })
    expect(() => publishRelease(options, run)).toThrow(error)
    expect(run).toHaveBeenCalledTimes(1)
  })
  it('accepts a concurrent publisher only after confirming the release exists', () => {
    const run = vi
      .fn()
      .mockImplementationOnce(() => {
        throw httpError(404)
      })
      .mockImplementationOnce(() => {
        throw httpError(422)
      })
      .mockReturnValue('')
    expect(publishRelease(options, run)).toBe('existing')
    expect(run).toHaveBeenCalledTimes(3)
  })
  it('does not hide a different 422 failure', () => {
    const error = httpError(422)
    const run = vi
      .fn()
      .mockImplementationOnce(() => {
        throw httpError(404)
      })
      .mockImplementationOnce(() => {
        throw error
      })
      .mockImplementationOnce(() => {
        throw httpError(404)
      })
    expect(() => publishRelease(options, run)).toThrow(error)
  })
  it('does not retry unknown publication failures', () => {
    const run = vi
      .fn()
      .mockImplementationOnce(() => {
        throw httpError(404)
      })
      .mockImplementationOnce(() => {
        throw httpError(500)
      })
    expect(() => publishRelease(options, run)).toThrow()
    expect(run).toHaveBeenCalledTimes(2)
  })
  it('rejects invalid input before invoking the CLI', () => {
    const run = vi.fn()
    expect(() => publishRelease({ ...options, tag: '--bad' }, run)).toThrow('Invalid release tag')
    expect(() => publishRelease({ ...options, repository: '' }, run)).toThrow('Invalid repository')
    expect(run).not.toHaveBeenCalled()
  })
})
