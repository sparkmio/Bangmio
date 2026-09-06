export type CommunityProfile = { name: string; username: string; avatar: string; url: string }

const GENERIC_PROFILE_NAMES = new Set([
  '社区成员',
  '社区用户',
  '用户',
  '匿名用户',
  '匿名',
  'unknown',
  'user'
])

function text(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim()
  return ''
}

function avatarValue(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (!value || typeof value !== 'object') return ''
  const item = value as Record<string, unknown>
  return text(item.large) || text(item.medium) || text(item.small) || ''
}

function isGenericProfileName(value: string): boolean {
  return GENERIC_PROFILE_NAMES.has(value.trim().toLocaleLowerCase())
}

function sourceFields(value: any) {
  if (typeof value === 'string' || typeof value === 'number') {
    const name = text(value)
    return { name, username: name, avatar: '', url: '' }
  }
  if (!value || typeof value !== 'object') return { name: '', username: '', avatar: '', url: '' }
  return {
    name: text(value.nickname) || text(value.name) || text(value.display_name),
    username: text(value.username),
    avatar: avatarValue(value.avatar),
    url: text(value.url)
  }
}

function profileSource(value: any): any {
  const candidates = [value?.user, value?.author, value?.creator, value]
  return (
    candidates
      .map((candidate, index) => ({ candidate, index, fields: sourceFields(candidate) }))
      .filter(({ fields }) =>
        Boolean(fields.name || fields.username || fields.avatar || fields.url)
      )
      .sort((left, right) => {
        const score = ({ fields }: { fields: ReturnType<typeof sourceFields> }) =>
          (fields.name && !isGenericProfileName(fields.name) ? 8 : 0) +
          (fields.username && !isGenericProfileName(fields.username) ? 5 : 0) +
          (fields.avatar ? 3 : 0) +
          (fields.url ? 2 : 0)
        return score(right) - score(left) || left.index - right.index
      })[0]?.candidate || {}
  )
}

export function communityProfile(value: any): CommunityProfile {
  const source = profileSource(value)
  const sourceData = sourceFields(source)
  const fallback = sourceFields(value)
  const username = sourceData.username || fallback.username
  const preferredName = sourceData.name || fallback.name
  const name = !isGenericProfileName(preferredName)
    ? preferredName
    : !isGenericProfileName(username)
      ? username
      : '社区成员'
  const avatar = sourceData.avatar || fallback.avatar
  const url = sourceData.url || fallback.url
  return { name, username, avatar, url }
}

/** Only an explicitly identified opening post may be moved out of the reply list. */
export function groupTopicView(source: any) {
  const replies = Array.isArray(source.replies) ? source.replies : []
  const opening = source.main_post
  if (!opening || typeof opening !== 'object' || !opening.id) return { topic: source, replies }
  return {
    topic: { ...source, content: opening.content, timestamp: opening.timestamp },
    replies: replies.filter((reply: any) => reply.id !== opening.id)
  }
}
