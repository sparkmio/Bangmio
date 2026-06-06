import { Hono } from 'hono'
import { cors } from 'hono/cors'
import userRoutes from './routes/user.js'
import animeRoutes from './routes/anime.js'
import collectionRoutes from './routes/collection.js'
import commentsRoutes from './routes/comments.js'
import doubanRoutes from './routes/douban.js'

const app = new Hono()

app.use('*', cors())

app.use('*', async (c, next) => {
  const country = c.req.header('cf-ipcountry') || ''
  c.env = c.env || {}
  c.env.CF_IP_COUNTRY = country
  await next()
})

app.use('/api/v1/*', async (c, next) => {
  try {
    await next()
  } catch (err) {
    throw err
  }
  try {
    if (c.res && c.res.ok) {
      const ct = c.res.headers.get('content-type') || ''
      if (ct.includes('json')) {
        const text = await c.res.text()
        const replaced = text.replace(/lain\.bgm\.tv/g, 'lain.bangumi.one')
        if (replaced !== text) {
          const h = new Headers(c.res.headers)
          h.delete('content-length')
          c.res = new Response(replaced, { status: c.res.status, headers: h })
        }
      }
    }
  } catch {}
})

app.route('/api/v1/user', userRoutes)
app.route('/api/v1/anime', animeRoutes)
app.route('/api/v1/collection', collectionRoutes)
app.route('/api/v1/comments', commentsRoutes)
app.route('/api/v1/douban', doubanRoutes)

app.get('/api/health', (c) => c.json({ status: 'ok', country: c.env?.CF_IP_COUNTRY || 'unknown' }))

export default app
