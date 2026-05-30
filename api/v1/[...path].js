export default (req, res) => {
  res.json({
    url: req.url,
    method: req.method,
    query: req.query
  })
}
