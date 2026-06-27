const DOUBAN_API = 'https://movie.douban.com'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export async function searchDouban(name) {
  const url = `${DOUBAN_API}/j/subject_suggest?q=${encodeURIComponent(name)}`
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Referer': 'https://movie.douban.com/' }
  })
  const data = await res.json()
  return data || []
}

export async function getDoubanAbstract(subjectId) {
  const url = `${DOUBAN_API}/j/subject_abstract?subject_id=${subjectId}`
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Referer': `https://movie.douban.com/subject/${subjectId}/` }
  })
  const data = await res.json()
  return data?.subject || data || null
}
