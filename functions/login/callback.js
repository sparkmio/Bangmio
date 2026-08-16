/**
 * OAuth callback routes must always load the Vue application while keeping
 * /login/callback?code=...&state=... in the browser address bar. Returning
 * the static index asset here avoids a Pages SPA fallback/404 redirect from
 * discarding the OAuth query before LoginCallback.vue can consume it.
 */
export async function onRequest(context) {
  const assetUrl = new URL('/index.html', context.request.url)
  return context.env.ASSETS.fetch(assetUrl)
}
