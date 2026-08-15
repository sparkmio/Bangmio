// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import router from './index.js'

describe('router', () => {
  it('redirects legacy game bookmarks to Settings after the game route was removed', () => {
    const legacyRoute = router.getRoutes().find(route => route.path === '/jump')

    expect(legacyRoute).toBeDefined()
    expect(legacyRoute.redirect).toBe('/settings')
  })
})
