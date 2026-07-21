import app from './_server.js'

export const onRequest = ctx => app.fetch(ctx.request, ctx.env, ctx)
