const { createHash, randomBytes } = require('node:crypto')
const jwt = require('jsonwebtoken')
const MobileSession = require('../models/MobileSession')
const User = require('../models/User')

const mobileSessionLifetime = 90 * 24 * 60 * 60 * 1000

function refreshHash(token) {
  return createHash('sha256').update(token).digest('hex')
}

function newRefreshToken() {
  return randomBytes(32).toString('base64url')
}

function tokenExpiry() {
  return new Date(Date.now() + mobileSessionLifetime)
}

function accessResponse(user, session) {
  const role = user.appRole
  const claims = { sub: user.id, role, ...(session && { sid: session.id }) }
  const token = jwt.sign(claims, process.env.JWT_SECRET, { expiresIn: '1h' })
  return { firstName: user.firstName, lastName: user.lastName, role, token }
}

async function signIn(user, mobile) {
  if (!mobile) return accessResponse(user)

  const refreshToken = newRefreshToken()
  const session = await MobileSession.create({
    userId: user.id,
    version: user.mobileSessionVersion,
    refreshHash: refreshHash(refreshToken),
    expiresAt: tokenExpiry(),
  })
  return { ...accessResponse(user, session), refreshToken }
}

async function renewSession(token) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token))
    return null

  const nextToken = newRefreshToken()
  const session = await MobileSession.findOneAndUpdate(
    { refreshHash: refreshHash(token), expiresAt: { $gt: new Date() } },
    { refreshHash: refreshHash(nextToken), expiresAt: tokenExpiry() },
    { returnDocument: 'after' },
  )
  if (!session) return null

  const user = await User.findById(session.userId)
  if (!user || session.version !== user.mobileSessionVersion) {
    await session.deleteOne()
    return null
  }

  return { ...accessResponse(user, session), refreshToken: nextToken }
}

async function revokeSession(token) {
  if (typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token)) {
    await MobileSession.deleteOne({ refreshHash: refreshHash(token) })
  }
}

async function authenticate(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET)
  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof payload.sub !== 'string'
  )
    return null

  const user = await User.findById(payload.sub)
  if (!user || payload.sid === undefined) return user

  const session = await MobileSession.exists({
    _id: payload.sid,
    userId: user.id,
    version: user.mobileSessionVersion,
    expiresAt: { $gt: new Date() },
  })
  return session ? user : null
}

module.exports = { signIn, renewSession, revokeSession, authenticate }
