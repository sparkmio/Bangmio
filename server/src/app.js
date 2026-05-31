import { Hono } from 'hono'
import { cors } from 'hono/cors'
import userRoutes from './routes/user.js'
import animeRoutes from './routes/anime.js'
import collectionRoutes from './routes/collection.js'
import commentsRoutes from './routes/comments.js'

const app = new Hono()

app.use('*', cors())

// IP geolocation detection - expose cf-ipcountry to route handlers
app.use('*', async (c, next) => {
  const country = c.req.header('cf-ipcountry') || ''
  c.env = c.env || {}
  c.env.CF_IP_COUNTRY = country
  await next()
})

app.route('/api/v1/user', userRoutes)
app.route('/api/v1/anime', animeRoutes)
app.route('/api/v1/collection', collectionRoutes)
app.route('/api/v1/comments', commentsRoutes)

app.get('/api/health', (c) => c.json({ status: 'ok', country: c.env?.CF_IP_COUNTRY || 'unknown' }))

export default app
