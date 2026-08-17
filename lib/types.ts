export type ImageSet = {
  small?: string
  grid?: string
  medium?: string
  large?: string
  common?: string
}

export type Subject = {
  id: number
  type?: number
  name?: string
  name_cn?: string
  summary?: string
  date?: string
  eps?: number
  eps_count?: number
  air_date?: string
  images?: ImageSet
  rating?: { score?: number; rank?: number; total?: number; count?: Record<string, number> }
  collection?: Record<string, number>
  tags?: Array<{ name?: string; count?: number }>
  infobox?: Array<{ key?: string; value?: unknown }>
  [key: string]: unknown
}

export type Collection = {
  subject_id?: number
  type?: number
  rate?: number
  comment?: string
  ep_status?: number
  subject?: Subject
  updated_at?: string
  [key: string]: unknown
}

export type User = {
  username?: string
  nickname?: string
  avatar?: { large?: string; medium?: string; small?: string } | string
  sign?: string
  email?: string
  bgmUid?: string | number | null
  [key: string]: unknown
}

export type ApiResult<T> = { data?: T; total?: number; error?: string }
