import { sitemapResponse, sitemapShard, sitemapShardNames } from '@/lib/sitemap'

export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return sitemapShardNames.map(name => ({ name }))
}

export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const xml = sitemapShard((await params).name)
  return xml ? sitemapResponse(xml) : new Response(null, { status: 404 })
}
