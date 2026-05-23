import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import userRoutes from './routes/user.js'
import animeRoutes from './routes/anime.js'
import collectionRoutes from './routes/collection.js'
import commentsRoutes from './routes/comments.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.use('/api/v1/user', userRoutes)
app.use('/api/v1/anime', animeRoutes)
app.use('/api/v1/collection', collectionRoutes)
app.use('/api/v1/comments', commentsRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Serve static files from client dist in production (if available)
const staticPath = path.resolve(__dirname, '../../client/dist')
if (fs.existsSync(staticPath)) {
  app.use(express.static(staticPath))

  // SPA fallback: serve index.html for non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
