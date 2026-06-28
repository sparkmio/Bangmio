const DOUBAN_API = 'https://movie.douban.com'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function stripTags(s) {
  return (s || '').replace(/<[^>]+>/g, '').trim()
}

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
  const allComments = []
  // 抓 2 页，共 40 条短评
  const starts = [0, 20]

  for (const start of starts) {
    try {
      const url = `${DOUBAN_API}/subject/${subjectId}/comments?start=${start}&limit=20&status=P`
      const res = await fetch(url, {
        headers: {
          'User-Agent': UA,
          'Referer': `${DOUBAN_API}/subject/${subjectId}/`,
          'Accept': 'text/html',
          'Accept-Language': 'zh-CN,zh;q=0.9'
        }
      })
      if (!res.ok) continue
      const html = await res.text()

      // 按 comment-item 分割逐条解析
      const parts = html.split(/(?=<div class="comment-item)/i)
      for (const part of parts) {
        if (!/comment-item/i.test(part)) continue

        // 用户名
        const userMatch = part.match(/<a[^>]*href="[^"]*\/people\/[^"]+"[^>]*>([^<]+)<\/a>/i)
        const user = userMatch ? userMatch[1].trim() : '匿名'

        // 评分：allstar50 -> 50, allstar40 -> 40 等
        const ratingMatch = part.match(/allstar(\d{2})/i)
          || part.match(/rating["\s]*([\d-]+)/i)
        let rating = 0
        if (ratingMatch) rating = parseInt(ratingMatch[1]) || 0

        // 日期
        const timeMatch = part.match(/<span class="comment-time[^"]*"[^>]*>([^<]+)<\/span>/i)
        const time = timeMatch ? timeMatch[1].trim() : ''

        // 内容
        const contentMatch = part.match(/<p class="[^"]*"[^>]*>([\s\S]*?)<\/p>/i)
        let content = contentMatch
          ? contentMatch[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim()
          : ''

        // 有用数
        const usefulMatch = part.match(/<span class="votes vote-count">(\d+)<\/span>/i)
          || part.match(/<span class="vote-count"[^>]*>(\d+)<\/span>/i)
          || part.match(/class="[^"]*vote-count[^"]*"[^>]*>(\d+)/i)
        const useful = usefulMatch ? parseInt(usefulMatch[1]) : 0

        if (content) {
          allComments.push({ user, rating, time, content, useful })
        }
        if (allComments.length >= 40) break
      }
    } catch {
      // 跳过该页错误，继续下一页
    }
    if (allComments.length >= 40) break
  }

  return allComments
}

export async function getDoubanReviews(subjectId) {
  const url = `${DOUBAN_API}/subject/${subjectId}/reviews`
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Referer': `${DOUBAN_API}/subject/${subjectId}/`,
      'Accept': 'text/html',
      'Accept-Language': 'zh-CN,zh;q=0.9'
    }
  })
  if (!res.ok) return []
  const html = await res.text()

  const reviews = []
  // 按 review-item 分割逐条解析
  const parts = html.split(/(?=<div class="review-item)/i)

  for (const part of parts.slice(0, 25)) {
    if (!/review-item/i.test(part)) continue

    // 用户名
    const userMatch = part.match(/<a[^>]*href="[^"]*\/people\/[^"]+"[^>]*>([^<]+)<\/a>/i)
    const user = userMatch ? userMatch[1].trim() : '匿名'

    // 评分：allstar50 -> 50, allstar40 -> 40, allstar30 -> 30, allstar20 -> 20, allstar10 -> 10
    const ratingMatch = part.match(/allstar(\d{2})/i)
    const rating = ratingMatch ? parseInt(ratingMatch[1]) : 0

    // 时间
    const timeMatch = part.match(/<span class="date"[^>]*>([^<]+)<\/span>/i)
    const time = timeMatch ? timeMatch[1].trim() : ''

    // 标题
    const titleMatch = part.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)
    const title = titleMatch ? stripTags(titleMatch[1]) : ''

    // 内容：截断 500 字
    const contentMatch = part.match(/<div class="review-content"[^>]*>([\s\S]*?)<\/div>/i)
    let content = contentMatch
      ? contentMatch[1]
          .replace(/<a[^>]*>\(展开\)<\/a>/gi, '')
          .replace(/<a[^>]*>展开<\/a>/gi, '')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .trim()
      : ''
    if (content.length > 500) content = content.slice(0, 500) + '...'

    // 有用数
    const usefulMatch = part.match(/<span class="num"[^>]*>(\d+)<\/span>/i)
      || part.match(/class="[^"]*action-btn[^"]*up[^"]*"[^>]*>[\s\S]*?(\d+)/i)
      || part.match(/class="[^"]*vote-count[^"]*"[^>]*>(\d+)/i)
    const useful = usefulMatch ? parseInt(usefulMatch[1]) : 0

    reviews.push({ user, rating, time, title, content, useful })
    if (reviews.length >= 20) break
  }

  return reviews
}
