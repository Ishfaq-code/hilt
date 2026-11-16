const mobileOrigins = new Set(['capacitor://localhost', 'https://localhost'])

function mobileCors(req, res, next) {
  res.vary('Origin')
  const origin = req.get('origin')
  if (!mobileOrigins.has(origin)) return next()

  res.set('Access-Control-Allow-Origin', origin)
  if (req.method !== 'OPTIONS') return next()

  res.set({
    'Access-Control-Allow-Methods':
      'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '600',
  })
  return res.sendStatus(204)
}

module.exports = mobileCors
