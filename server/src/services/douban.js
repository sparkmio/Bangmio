const DOUBAN_API = 'https://movie.douban.com'
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
const DOUBAN_HEADERS = {
  'User-Agent': UA,
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Cache-Control': 'max-age=0'
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

export async function scrapeDoubanSubject(subjectId) {
  const url = `${DOUBAN_API}/subject/${subjectId}/`
  const res = await fetch(url, { headers: DOUBAN_HEADERS })
  if (!res.ok) return { rating: {} }
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
    headers: { ...DOUBAN_HEADERS, Referer: `https://movie.douban.com/subject/${subjectId}/` }
  })
  if (!res.ok) return []
  const html = await res.text()

  const reviews = []
  const blocks = html.split(/<div class="comment-item"/)
  for (let i = 1; i < blocks.length && i <= 20; i++) {
    const block = blocks[i]
    const authorMatch = block.match(/<a[^>]*href="\/people\/[^"]*"[^>]*>([^<]+)<\/a>/)
    const ratingMatch = block.match(/allstar(\d+)/)
    const timeMatch = block.match(/title="(\d{4}-\d{2}-\d{2}[^"]*)"/)
    const contentMatch = block.match(/<span class="short">([\s\S]*?)<\/span>/)
    const votesMatch = block.match(/<span class="votes">(\d+)<\/span>/)

    if (authorMatch || contentMatch) {
      reviews.push({
        id: String(i),
        author: authorMatch ? authorMatch[1].trim() : '',
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
  const res = await fetch(url, { headers: DOUBAN_HEADERS })
  if (!res.ok) return []
  const html = await res.text()

  const discussions = []
  const rows = html.split(/<tr[^>]*>/)
  let currentRow = ''
  for (let i = 0; i < rows.length; i++) {
    currentRow += rows[i]
    if (currentRow.includes('</tr>')) {
      const titleMatch = currentRow.match(/title="([^"]+)"/)
      const hrefMatch = currentRow.match(/href="(\/subject\/\d+\/discussion\/\d+\/[^"]*)"/)
      const authorMatch = currentRow.match(/<a[^>]*href="\/people\/[^"]*"[^>]*>([^<]+)<\/a>/)
      const repliesMatch = currentRow.match(/>\s*(\d+)\s*</)
      const timeMatch = currentRow.match(/(\d{4}-\d{2}-\d{2})/)

      if (titleMatch && hrefMatch) {
        discussions.push({
          title: titleMatch[1].trim(),
          url: `https://movie.douban.com${hrefMatch[1]}`,
          author: authorMatch ? authorMatch[1].trim() : '',
          replies: repliesMatch ? parseInt(repliesMatch[1]) : 0,
          lastUpdate: timeMatch ? timeMatch[1] : ''
        })
      }
      currentRow = ''
    }
  }
  return discussions.slice(0, 15)
}
