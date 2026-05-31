export const onRequest = async (ctx) => {
  const url = new URL(ctx.request.url)
  const upstream = `https://bgm.tv${url.pathname}${url.search}`
  const headers = new Headers(ctx.request.headers)
  headers.delete('host')
  headers.delete('cf-connecting-ip')
  headers.delete('x-forwarded-host')

  const upstreamResp = await fetch(upstream, {
    method: ctx.request.method,
    headers,
    body: ['GET', 'HEAD'].includes(ctx.request.method) ? undefined : ctx.request.body,
    redirect: 'manual'
  })

  const ct = upstreamResp.headers.get('content-type') || ''

  if (ct.includes('text/html')) {
    let html = await upstreamResp.text()
    html = html.replace(/https?:\/\/bgm\.tv/g, 'https://bangmio.pages.dev')
    html = html.replace(/action="\/oauth\//g, 'action="/oauth/')
    html = html.replace(/href="\/oauth\//g, 'href="/oauth/')
    const newHeaders = forwardHeaders(upstreamResp.headers)
    newHeaders.set('content-type', ct)
    return new Response(html, { status: upstreamResp.status, headers: newHeaders })
  }

  if (upstreamResp.status >= 300 && upstreamResp.status < 400) {
    const loc = upstreamResp.headers.get('location')
    const newHeaders = forwardHeaders(upstreamResp.headers)
    if (loc) {
      const newLoc = loc.replace(/https?:\/\/bgm\.tv/g, 'https://bangmio.pages.dev')
      newHeaders.set('location', newLoc)
    }
    return new Response(null, { status: upstreamResp.status, headers: newHeaders })
  }

  return new Response(upstreamResp.body, {
    status: upstreamResp.status,
    headers: forwardHeaders(upstreamResp.headers)
  })
}

function forwardHeaders(h) {
  const out = new Headers(h)
  out.delete('content-security-policy')
  out.delete('x-frame-options')
  out.delete('content-encoding')
  out.delete('transfer-encoding')
  return out
}
