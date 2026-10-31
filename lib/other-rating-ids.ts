type InfoboxEntry = { key?: unknown; value?: unknown }

function flattenValue(value: unknown): string[] {
  if (typeof value === 'string' || typeof value === 'number') return [String(value)]
  if (Array.isArray(value)) return value.flatMap(flattenValue)
  if (value && typeof value === 'object') return Object.values(value).flatMap(flattenValue)
  return []
}

function numericId(values: string[]) {
  for (const value of values) {
    const urlId = value.match(/myanimelist\.net\/anime\/(\d+)/i)?.[1]
    const plainId = value.trim().match(/^\d{1,10}$/)?.[0]
    const id = urlId || plainId
    if (id && Number(id) > 0) return id
  }
  return ''
}

function textValues(value: unknown): string[] {
  return flattenValue(value)
    .map(item => item.trim())
    .filter(Boolean)
}

export function externalSearchTitle(subject: {
  name?: string
  infobox?: InfoboxEntry[]
  [key: string]: unknown
}) {
  const explicitAlternates = [
    subject.name_en,
    subject.nameEn,
    subject.english_title,
    subject.name_romanized,
    subject.name_romaji,
    subject.name_original,
    subject.name_jp
  ].flatMap(textValues)
  const infoboxAlternates = (subject.infobox || [])
    .filter(item => /english|英文|romaji|roman|罗马音|罗马字/i.test(String(item?.key || '')))
    .flatMap(item => textValues(item?.value))

  // `name` is Bangumi's canonical/original title; deliberately never use `name_cn` here.
  return [...explicitAlternates, ...infoboxAlternates, ...textValues(subject.name)][0] || ''
}

export function extractOtherRatingIds(infobox: InfoboxEntry[] = []) {
  let malId = ''
  let imdbId = ''

  for (const item of infobox) {
    const key = String(item?.key || '')
      .toLowerCase()
      .replace(/[^a-z]/g, '')
    const values = flattenValue(item?.value)
    if (!malId && (key === 'mal' || key.startsWith('malid') || key.includes('myanimelist')))
      malId = numericId(values)
    if (!imdbId && key.includes('imdb')) {
      for (const value of values) {
        const id = value.match(/(?:imdb\.com\/title\/)?(tt\d{5,12})/i)?.[1]
        if (id) {
          imdbId = id.toLowerCase()
          break
        }
      }
    }
  }

  return { malId, imdbId }
}
