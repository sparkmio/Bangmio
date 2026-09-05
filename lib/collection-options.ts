/** Bangumi subject collection states, not individual episode states. */
export function collectionOptions(type = 2) {
  const verbs =
    type === 1
      ? ['想读', '读过', '在读']
      : type === 3
        ? ['想听', '听过', '在听']
        : type === 4
          ? ['想玩', '玩过', '在玩']
          : ['想看', '看过', '在看']
  return [...verbs, '搁置', '抛弃'].map((label, index) => ({ label, value: index + 1 }))
}
export function formatEpisodeDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '未知'
  const value = Math.floor(seconds)
  const hours = Math.floor(value / 3600)
  const minutes = Math.floor((value % 3600) / 60)
  const rest = value % 60
  return [
    hours ? String(hours) : '',
    String(minutes).padStart(2, '0'),
    String(rest).padStart(2, '0')
  ]
    .filter(Boolean)
    .join(':')
}
