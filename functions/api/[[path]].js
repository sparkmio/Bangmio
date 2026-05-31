import app from '../../server/src/app.js'

export const onRequest = (ctx) => app.fetch(ctx.request, ctx.env, ctx)
