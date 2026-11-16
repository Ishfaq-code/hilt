const { authenticate } = require('../services/authSessions')

function authRequired(optional = false) {
  return async (req, res, next) => {
    const match = req.get('authorization')?.match(/^Bearer\s+(.+)$/i)
    if (!match) {
      if (optional) return next()
      return res.status(401).json({ error: 'Authentication is required.' })
    }
    if (!process.env.JWT_SECRET) {
      return res
        .status(500)
        .json({ error: 'Authentication is not configured.' })
    }

    try {
      req.user = await authenticate(match[1])
    } catch (error) {
      if (
        !['JsonWebTokenError', 'TokenExpiredError', 'CastError'].includes(
          error.name,
        )
      )
        return next(error)
    }
    if (!req.user) {
      return res
        .status(401)
        .json({ error: 'The authentication token is invalid or expired.' })
    }
    next()
  }
}

module.exports = authRequired
