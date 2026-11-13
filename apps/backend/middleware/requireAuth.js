const jwt = require('jsonwebtoken')
const User = require('../models/User')

async function requireAuth(req, res, next) {
  const authorization = req.get('authorization')
  const match = typeof authorization === 'string' && authorization.match(/^Bearer\s+(.+)$/i)

  if (!match) {
    return res.status(401).json({ error: 'Authentication is required.' })
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Authentication is not configured.' })
  }

  try {
    const payload = jwt.verify(match[1], process.env.JWT_SECRET)
    if (!payload || typeof payload !== 'object' || typeof payload.sub !== 'string') {
      return res.status(401).json({ error: 'The authentication token is invalid or expired.' })
    }

    const user = await User.findById(payload.sub)
    if (!user) {
      return res.status(401).json({ error: 'The authentication token is invalid or expired.' })
    }

    req.user = user
    return next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || error.name === 'CastError') {
      return res.status(401).json({ error: 'The authentication token is invalid or expired.' })
    }
    return next(error)
  }
}

module.exports = requireAuth
