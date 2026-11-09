const { createHash } = require('node:crypto')
const { parse: parseCookies } = require('cookie')

const Session = require('../models/Session')

const sessionLifetimeMs = 24 * 60 * 60 * 1000
const sessionCookieName = 'hilt_session'
const sessionCookie = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production'
    && process.env.SESSION_COOKIE_SECURE !== 'false',
  path: '/api',
}

function isSameOrigin(req) {
  // TLS can terminate before Caddy; production cookies use the public HTTPS origin.
  const protocol = sessionCookie.secure ? 'https' : req.protocol

  return req.get('Origin') === `${protocol}://${req.get('Host')}`
}

async function requireSession(req, res, next) {
  const authorization = req.get('Authorization')
  const viaCookie = !authorization
  const token = viaCookie
    ? parseCookies(req.get('Cookie') || '')[sessionCookieName]
    : /^Bearer ([a-f0-9]{64})$/i.exec(authorization)?.[1]

  if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
    if (viaCookie) {
      res.clearCookie(sessionCookieName, sessionCookie)
    }

    return res.status(401).json({ error: 'Sign in to continue.' })
  }

  const session = await Session.findOne({
    tokenHash: createHash('sha256').update(token).digest('hex'),
    // MongoDB's TTL cleanup is asynchronous, so check expiry on every request.
    expiresAt: { $gt: new Date() },
  }).populate('user')

  if (!session?.user) {
    if (viaCookie) {
      res.clearCookie(sessionCookieName, sessionCookie)
    }

    return res.status(401).json({
      error: 'The session is invalid or expired. Please log in again.',
    })
  }

  const changesData = !['GET', 'HEAD', 'OPTIONS'].includes(req.method)

  if (viaCookie && changesData && !isSameOrigin(req)) {
    return res.status(403).json({
      error: 'Send changes from the Hilt website.',
    })
  }

  req.auth = {
    session,
    user: session.user,
    viaCookie,
  }

  next()
}

module.exports = {
  requireSession,
  isSameOrigin,
  sessionLifetimeMs,
  sessionCookieName,
  sessionCookie,
}
