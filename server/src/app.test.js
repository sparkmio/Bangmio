import { describe, expect, it } from 'vitest'
import app from './app.js'

describe('health endpoints', () => {
  it('supports the versioned API health route used by Next/OpenNext', async () => {
    const response = await app.request(
      'https://bangmio.site/api/v1/health',
      { headers: { 'cf-ipcountry': 'CN' } },
      {}
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: 'ok', country: 'CN' })
  })
})
