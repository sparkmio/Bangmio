import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const runGh = args =>
  execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

// An existing release is authoritative: never overwrite its notes or republish it.
export function publishRelease({ repository, tag, notesFile = 'release-notes.md' }, run = runGh) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository || '')) throw new Error('Invalid repository')
  if (!/^v\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(tag || '')) throw new Error('Invalid release tag')
  const endpoint = `repos/${repository}/releases/tags/${encodeURIComponent(tag)}`
  const exists = () => {
    try {
      run(['api', endpoint, '--silent'])
      return true
    } catch (error) {
      // Auth, rate-limit and network failures must not be mistaken for absence.
      if (String(error.stderr || '').includes('(HTTP 404)')) return false
      throw error
    }
  }
  if (exists()) return 'existing'
  try {
    run([
      'release',
      'create',
      tag,
      '--repo',
      repository,
      '--verify-tag',
      '--title',
      `Bangmio ${tag}`,
      '--notes-file',
      notesFile
    ])
    return 'created'
  } catch (error) {
    // Another publisher may have won the race after our first lookup.
    if (String(error.stderr || '').includes('(HTTP 422)') && exists()) return 'existing'
    throw error
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = publishRelease({
      repository: process.env.GITHUB_REPOSITORY,
      tag: process.env.RELEASE_TAG
    })
    console.log(
      result === 'existing'
        ? 'Release already exists; preserving existing release.'
        : 'Release created.'
    )
  } catch {
    console.error('Release publication failed; check tag, GitHub permissions and API availability.')
    process.exitCode = 1
  }
}
