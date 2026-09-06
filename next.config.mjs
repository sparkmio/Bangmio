import path from 'node:path'

// OpenNext/Wrangler emits development diagnostics through a local log file. Keep
// that state inside the writable workspace and avoid repeated disk errors when the
// user's global AppData directory is read-only.
if (process.env.NODE_ENV === 'development' && !process.env.WRANGLER_CONFIG_DIR) {
  process.env.WRANGLER_WRITE_LOGS ??= 'false'
  process.env.XDG_CONFIG_HOME ??= path.join(process.cwd(), '.wrangler', 'config-home')
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next 16 expects hostnames here, not complete URLs.
  allowedDevOrigins: [
    '127.0.0.1',
    ...(process.env.BANGMIO_DEV_ORIGINS || '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean)
  ],
  poweredByHeader: false,
  compress: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' }
    ],
    formats: ['image/avif', 'image/webp']
  }
}

export default nextConfig
