import app from '../../server/src/index.js'

export default (req, res) => {
  if (!req.url.startsWith('/api/v1')) {
    req.url = '/api/v1' + req.url
  }
  app(req, res)
}
