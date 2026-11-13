function requireAppAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication is required.' })
  }

  if (req.user.appRole !== 'admin') {
    return res.status(403).json({ error: 'App administrator access is required.' })
  }

  return next()
}

module.exports = requireAppAdmin
