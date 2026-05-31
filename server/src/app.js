import { Hono } from 'hono'
import { cors } from 'hono/cors'
import userRoutes from './routes/user.js'
import animeRoutes from './routes/anime.js'
import collectionRoutes from './routes/collection.js'
import commentsRoutes from './routes/comments.js'

const app = new Hono()

app.use('*', cors())

app.use('/api/v1/*', async (c, next) => {
  await next()
  if (c.res && c.res.ok) {
    const ct = c.res.headers.get('content-type') || ''
    if (ct.includes('json')) {
      try {
        const text = await c.res.text()
        const replaced = text.replace(/lain\.bgm\.tv/g, 'bangmio.pages.dev/img')
        if (replaced !== text) {
          const h = new Headers(c.res.headers)
          h.delete('content-length')
          c.res = new Response(replaced, { status: c.res.status, headers: h })
        }
      } catch { /* ignore - passthrough */ }
    }
  }
})

app.route('/api/v1/user', userRoutes)
app.route('/api/v1/anime', animeRoutes)
app.route('/api/v1/collection', collectionRoutes)
app.route('/api/v1/comments', commentsRoutes)

app.get('/api/health', (c) => c.json({ status: 'ok' }))

export default app
