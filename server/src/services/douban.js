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

export async function getDoubanComments(subjectId) {
  const url = `https://movie.douban.com/subject/${subjectId}/comments?status=P&limit=20`
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Referer': `https://movie.douban.com/subject/${subjectId}/`,
      'Accept': 'text/html',
      'Accept-Language': 'zh-CN,zh;q=0.9'
    }
  })
  if (!res.ok) return []
  const html = await res.text()

  const comments = []
  // 豆瓣评论 HTML 结构：每个评论在 .comment-item 中
  const itemRegex = /<div class="comment-item"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi
  const items = html.match(itemRegex) || []

  for (const item of items.slice(0, 10)) {
    // 用户名
    const userMatch = item.match(/<span class="comment-info">[\s\S]*?<a[^>]*>([^<]+)<\/a>/)
    const user = userMatch ? userMatch[1].trim() : '匿名'

    // 评分
    const ratingMatch = item.match(/rating["\s]*([\d-]+)/)
    const rating = ratingMatch ? parseInt(ratingMatch[1]) : 0

    // 日期
    const timeMatch = item.match(/<span class="comment-time "[^>]*>([^<]+)<\/span>/)
    const time = timeMatch ? timeMatch[1].trim() : ''

    // 内容
    const contentMatch = item.match(/<p class=""[^>]*>([\s\S]*?)<\/p>/)
    let content = contentMatch ? contentMatch[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim() : ''

    // 有用数
    const usefulMatch = item.match(/<span class="votes vote-count">(\d+)<\/span>/)
    const useful = usefulMatch ? parseInt(usefulMatch[1]) : 0

    if (content) {
      comments.push({ user, rating, time, content, useful })
    }
  }

  return comments
}
