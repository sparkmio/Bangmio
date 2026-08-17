// The existing API remains a JavaScript Hono module during the incremental migration.
// @ts-expect-error — no declaration file exists for the legacy JavaScript entrypoint.
import legacyApp from '../../../../server/src/app.js'
import { getCloudflareContext } from '@opennextjs/cloudflare'

type HonoFetcher = { fetch: (request: Request, env?: Record<string, unknown>, context?: unknown) => Response | Promise<Response> }
const app = legacyApp as HonoFetcher

async function handle(request: Request) {
  let env: Record<string, unknown> = {}
  let executionCtx: unknown
  try {
    const context = await getCloudflareContext({ async: true })
    env = context.env as Record<string, unknown>
    executionCtx = context.ctx
  } catch {
    // `next dev` without Wrangler has no Cloudflare bindings. Public/Bangumi
    // routes still work; account POSTs correctly report missing bindings.
  }
  return app.fetch(request, env, executionCtx)
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const DELETE = handle
export const OPTIONS = handle
