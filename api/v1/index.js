import app from '../../server/src/index.js'

export default (req, res) => {
  if (req.query.url) {
    const qs = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''
    const cleanQs = qs.replace(/(^[?&]|&)url=[^&]*/g, '').replace(/^[?&]/, '')
    req.url = '/api/v1/' + req.query.url + (cleanQs ? '?' + cleanQs : '')
  }
  app(req, res)
}
