const { createHash, randomBytes } = require('node:crypto')
const express = require('express')
const argon2 = require('argon2')
const { rateLimit } = require('express-rate-limit')
const isEmail = require('validator/lib/isEmail')
const User = require('./models/User')
const Session = require('./models/Session')

const router = express.Router()
const sessionLifetimeMs = 24 * 60 * 60 * 1000
let dummyPasswordHash

function publicUser(user) {
  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    emailAddress: user.emailAddress,
  }
}

function readCredentials(body) {
  if (!body || typeof body.emailAddress !== 'string' || typeof body.password !== 'string') {
    return null
  }

  const emailAddress = body.emailAddress.trim().toLowerCase()
  const passwordLength = Array.from(body.password).length
  if (!isEmail(emailAddress) || passwordLength < 1 || passwordLength > 128) {
    return null
  }

  return { emailAddress, password: body.password }
}

// Separate budgets keep registration attempts from using up the login budget.
const registrationLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Try again in 15 minutes.' },
})
const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
})

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store')
  if (req.method === 'POST' && ['/register', '/login'].includes(req.path) && !req.is('application/json')) {
    return res.status(415).json({ error: 'Send the request as application/json.' })
  }
  next()
})
router.use(express.json({ limit: '8kb' }))

router.post('/register', registrationLimit, async (req, res) => {
  const credentials = readCredentials(req.body)
  if (!credentials || Array.from(credentials.password).length < 15) {
    return res.status(400).json({ error: 'A valid emailAddress and a password of 15–128 characters are required.' })
  }

  const { firstName, lastName } = req.body
  if ([firstName, lastName].some((name) => typeof name !== 'string' || !name.trim() || name.trim().length > 100)) {
    return res.status(400).json({ error: 'firstName and lastName must each contain 1–100 characters.' })
  }

  const passwordHash = await argon2.hash(credentials.password, { type: argon2.argon2id })
  try {
    // Assign fields explicitly so clients cannot choose a hash, ID, or role.
    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      emailAddress: credentials.emailAddress,
      passwordHash,
    })
    return res.status(201).json({ user: publicUser(user) })
  } catch (error) {
    // The unique index also covers two registrations racing for the same email.
    if (error.code === 11000) {
      return res.status(409).json({ error: 'An account with this email address already exists.' })
    }
    throw error
  }
})

router.post('/login', loginLimit, async (req, res) => {
  const credentials = readCredentials(req.body)
  if (!credentials) {
    return res.status(400).json({ error: 'A valid emailAddress and a password of 1–128 characters are required.' })
  }

  const user = await User.findOne({ emailAddress: credentials.emailAddress }).select('+passwordHash')
  // Run the same expensive verification for unknown emails and legacy seed users.
  // They receive the same response as an incorrect password.
  if (!dummyPasswordHash) dummyPasswordHash = argon2.hash(randomBytes(32))
  const passwordMatches = await argon2.verify(user?.passwordHash || await dummyPasswordHash, credentials.password)
  if (!user?.passwordHash || !passwordMatches) {
    return res.status(401).json({ error: 'Invalid email address or password.' })
  }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + sessionLifetimeMs)
  // Only a digest is stored: reading the sessions collection cannot reveal tokens.
  await Session.create({
    tokenHash: createHash('sha256').update(token).digest('hex'),
    user: user._id,
    expiresAt,
  })

  return res.json({ token, tokenType: 'Bearer', expiresAt, user: publicUser(user) })
})

async function requireSession(req, res, next) {
  const match = /^Bearer ([a-f0-9]{64})$/i.exec(req.get('Authorization') || '')
  if (!match) {
    return res.status(401).json({ error: 'A valid Bearer token is required.' })
  }

  const session = await Session.findOne({
    tokenHash: createHash('sha256').update(match[1]).digest('hex'),
    // MongoDB's TTL cleanup is asynchronous, so expiry must be checked here too.
    expiresAt: { $gt: new Date() },
  }).populate('user')
  if (!session?.user) {
    return res.status(401).json({ error: 'The session is invalid or expired. Please log in again.' })
  }

  req.auth = { session, user: session.user }
  next()
}

router.get('/me', requireSession, (req, res) => {
  res.json({ user: publicUser(req.auth.user) })
})

router.post('/logout', requireSession, async (req, res) => {
  await Session.deleteOne({ _id: req.auth.session._id })
  res.status(204).end()
})

module.exports = { router, requireSession }
