import { sitemapIndex, sitemapResponse } from '@/lib/sitemap'

export const dynamic = 'force-static'

export function GET() {
  return sitemapResponse(sitemapIndex())
}
