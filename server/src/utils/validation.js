export function parsePositiveId(value) {
  const text = String(value ?? '').trim()
  if (!/^\d+$/.test(text)) return null
  const id = Number(text)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export function parseBoundedInteger(value, { min, max, fallback }) {
  if (value === undefined || value === null || value === '') return fallback
  const text = String(value).trim()
  if (!/^-?\d+$/.test(text)) return null
  const number = Number(text)
  return Number.isInteger(number) && number >= min && number <= max ? number : null
}
