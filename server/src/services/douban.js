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
    headers: { 'User-Agent': UA, 'Referer': `https://movie.douban.com/subject/${subjectId}` }
  })
  const data = await res.json()
  return data?.subject || data || null
}

export async function scrapeDoubanSubject(subjectId) {
  const url = `${DOUBAN_API}/subject/${subjectId}/`
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'zh-CN,zh;q=0.9' }
  })
  if (!res.ok) return null
  const html = await res.text()

  const rating = {}
  const ratingItems = html.match(/<span class="rating_per">([\d.]+)%<\/span>/g)
  if (ratingItems && ratingItems.length >= 5) {
    const stars = ['5', '4', '3', '2', '1']
    ratingItems.slice(0, 5).forEach((m, i) => {
      const pct = parseFloat(m.replace(/[^0-9.]/g, ''))
      if (stars[i]) rating[stars[i]] = pct
    })
  }

  const shortReviews = await scrapeShortReviews(subjectId)

  return { rating, short_reviews: shortReviews }
}

export async function scrapeShortReviews(subjectId) {
  const url = `${DOUBAN_API}/subject/${subjectId}/comments?status=P`
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'zh-CN,zh;q=0.9' }
  })
  if (!res.ok) return []
  const html = await res.text()

  const reviews = []
  const blocks = html.split(/<div class="comment-item"/)
  for (let i = 1; i < blocks.length && i <= 20; i++) {
    const block = blocks[i]
    const authorMatch = block.match(/<a[^>]*href="\/user\/[^"]*"[^>]*>([^<]+)<\/a>/)
    const ratingMatch = block.match(/allstar(\d+)/)
    const timeMatch = block.match(/title="(\d{4}-\d{2}-\d{2}[^"]*)"/)
    const contentMatch = block.match(/<p[^>]*>([^<]*(?:<br\s*\/?>[^<]*)*)<\/p>/i)
    const votesMatch = block.match(/(\d+)\s*(?:有用|赞)/)

    if (authorMatch) {
      reviews.push({
        id: String(i),
        author: authorMatch[1].trim(),
        avatar: '',
        rating: ratingMatch ? parseInt(ratingMatch[1]) / 10 : 0,
        content: contentMatch ? contentMatch[1].replace(/<[^>]+>/g, '').trim() : '',
        date: timeMatch ? timeMatch[1] : '',
        votes: votesMatch ? parseInt(votesMatch[1]) : 0
      })
    }
  }
  return reviews
}

export async function scrapeDoubanDiscussions(subjectId) {
  const url = `${DOUBAN_API}/subject/${subjectId}/discussion/`
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'zh-CN,zh;q=0.9' }
  })
  if (!res.ok) return []
  const html = await res.text()

  const discussions = []
  const rows = html.split(/<tr[^>]*class="[^"]*topic-item[^"]*"/)
  for (let i = 1; i < rows.length && i <= 15; i++) {
    const row = rows[i]
    const titleMatch = row.match(/title="([^"]+)"/)
    const hrefMatch = row.match(/href="([^"]+)"/)
    const authorMatch = row.match(/<a[^>]*>([^<]+)<\/a>/)
    const repliesMatch = row.match(/<td[^>]*>\s*(\d+)\s*<\/td>/)
    const timeMatch = row.match(/(\d{4}-\d{2}-\d{2}\s*\d{2}:\d{2})/)

    if (titleMatch && hrefMatch) {
      const href = hrefMatch[1]
      discussions.push({
        title: titleMatch[1].trim(),
        url: href.startsWith('http') ? href : `https://movie.douban.com${href}`,
        author: authorMatch ? authorMatch[1].trim() : '',
        replies: repliesMatch ? parseInt(repliesMatch[1]) : 0,
        lastUpdate: timeMatch ? timeMatch[1] : ''
      })
    }
  }
  return discussions
}
