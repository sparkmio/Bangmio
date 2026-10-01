// Keep the legacy health endpoint available alongside the versioned Hono API.
// The OpenNext app only owns /api/v1/[...path], so /api/health needs a route
// handler of its own for local and Worker deployments.
// @ts-expect-error — no declaration file exists for the legacy JavaScript entrypoint.
import legacyApp from '../../../server/src/app.js'
import { getCloudflareContext } from '@opennextjs/cloudflare'

type HonoFetcher = {
  fetch: (
    request: Request,
    env?: Record<string, unknown>,
    context?: unknown
  ) => Response | Promise<Response>
}

const app = legacyApp as HonoFetcher

async function handle(request: Request) {
  let env: Record<string, unknown> = {}
  let executionCtx: unknown
  try {
    const context = await getCloudflareContext({ async: true })
    env = context.env as Record<string, unknown>
    executionCtx = context.ctx
  } catch {
    // next dev without Wrangler has no Cloudflare bindings.
  }
  return app.fetch(request, env, executionCtx)
}

export const GET = handle
export const HEAD = handle
