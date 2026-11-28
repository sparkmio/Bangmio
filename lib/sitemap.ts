import catalog from './sitemap-catalog.json'

const origin = 'https://bangmio.site'
const namespace = 'http://www.sitemaps.org/schemas/sitemap/0.9'
const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>'
const staticPages = [
  ['/', 'weekly', '1.0'],
  ['/anime', 'weekly', '0.8'],
  ['/groups', 'monthly', '0.5'],
  ['/trending', 'monthly', '0.5'],
  ['/about', 'monthly', '0.5'],
  ['/privacy', 'monthly', '0.5']
]

const shards: Record<string, string> = catalog.shards
export const sitemapShardNames = ['site.xml', ...Object.keys(shards).map(id => id + '.xml')]

export function sitemapIndex() {
  const entries = sitemapShardNames.map(
    name => `<sitemap><loc>${origin}/sitemap-${name}</loc></sitemap>`
  )
  return `${xmlHeader}\n<sitemapindex xmlns="${namespace}">\n${entries.join('\n')}\n</sitemapindex>`
}

export function sitemapShard(name: string) {
  const entries: string[] = []
  if (name === 'site.xml') {
    for (const [path, frequency, priority] of staticPages) {
      entries.push(
        `<url><loc>${origin}${path}</loc><changefreq>${frequency}</changefreq><priority>${priority}</priority></url>`
      )
    }
  } else {
    const id = /^(0|[1-9]\d*)\.xml$/.exec(name)?.[1]
    if (!id || !Object.hasOwn(shards, id)) return null
    const bits = Uint8Array.from(atob(shards[id]), char => char.charCodeAt(0))
    const start = Number(id) * catalog.shardSize
    for (let offset = 0; offset < catalog.shardSize; offset++) {
      if (bits[offset >> 3] & (1 << (offset & 7))) {
        entries.push(`<url><loc>${origin}/anime/${start + offset}</loc></url>`)
      }
    }
  }
  return `${xmlHeader}\n<urlset xmlns="${namespace}">\n${entries.join('\n')}\n</urlset>`
}

export function sitemapResponse(xml: string) {
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  })
}
