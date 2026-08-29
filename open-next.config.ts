import type { OpenNextConfig } from '@opennextjs/cloudflare'

const override = {
  converter: 'edge' as const,
  proxyExternalRequest: 'fetch' as const,
  incrementalCache: 'dummy' as const,
  tagCache: 'dummy' as const,
  queue: 'dummy' as const
}

const config: OpenNextConfig = {
  buildCommand: 'npm run server:build && npm run next:build',
  default: {
    override: {
      wrapper: 'cloudflare-node',
      ...override
    }
  },
  edgeExternals: ['node:crypto'],
  middleware: {
    external: true,
    override: {
      wrapper: 'cloudflare-edge',
      ...override
    }
  }
}

export default config
