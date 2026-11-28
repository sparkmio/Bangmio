/** Upgrade legacy CDN URLs still present in saved sessions and cached payloads. */
export function bangumiImage(value?: string) {
  if (!value) return ''
  return value.replace(
    /^(?:https?:)?\/\/(lain\.bgm\.tv|lain\.bgm\.lat|lain\.bangumi\.pro)(?=[/:?#]|$)/i,
    'https://lain.bgm.lat'
  )
}

export function bangumiImageFallback(value: string) {
  return value
    .replace(/^https:\/\/lain\.bgm\.lat(?=\/)/i, 'https://lain.bgm.tv')
    .replace(/^(https:\/\/lain\.bgm\.tv)\/r\/\d+\//, '$1/')
}
