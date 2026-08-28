import { Hono } from 'hono'

const app = new Hono()

app.get('/', c =>
  c.json({
    data: {
      country: c.env?.CF_IP_COUNTRY || 'unknown',
      isChina: (c.env?.CF_IP_COUNTRY || '') === 'CN'
    }
  })
)

export default app
