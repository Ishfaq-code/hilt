const express = require('express')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const passwordService = require('../services/passwordService')
const passwordValidationService = require('../services/passwordValidationService')
const PendingRegistration = require('../models/PendingRegistration')
const emailService = require('../services/emailService')
const crypto = require('node:crypto')
const { rateLimit } = require('express-rate-limit')

const router = express.Router()
const tokenLifetime = '1h'
const verificationLifetimeMs = 10 * 60 * 1000
const maxVerificationAttempts = 5
const verificationRequestLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many verification requests. Please try again later.' },
})

function createVerificationCode() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')
}

function hashVerificationCode(email, code) {
  return crypto.createHash('sha256').update(`${email}:${code}`).digest('hex')
}

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {}
    const requiredFields = [email, password]
    if (requiredFields.some((value) => typeof value !== 'string' || !value.trim())) {
      return res.status(409).json({ error: 'Email and password are required.' })
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Authentication is not configured.' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash')
    if (!user || !(await passwordService.verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    const role = user.appRole
    const token = jwt.sign({ sub: user.id, role }, process.env.JWT_SECRET, { expiresIn: tokenLifetime })

    return res.status(200).json({ firstName: user.firstName, lastName: user.lastName, role, token })
  } catch (error) {
    return next(error)
  }
})

router.post('/register', verificationRequestLimit, async (req, res, next) => {
  try {
    const { firstName, lastName, email, password } = req.body ?? {}
    const requiredFields = [firstName, lastName, email, password]
    if (requiredFields.some((value) => typeof value !== 'string' || !value.trim())) {
      return res.status(400).json({ error: 'Not all details were provided.' })
    }

    if (!passwordValidationService.isValid(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters and include at least one number and one special symbol.',
      })
    }
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Authentication is not configured.' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    if (await User.exists({ email: normalizedEmail })) {
      return res.status(409).json({ error: 'An account with that email already exists.' })
    }

    const verificationCode = createVerificationCode()
    const pendingRegistration = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      passwordHash: await passwordService.hashPassword(password),
      codeHash: hashVerificationCode(normalizedEmail, verificationCode),
      expiresAt: new Date(Date.now() + verificationLifetimeMs),
      attempts: 0,
    }
    await PendingRegistration.findOneAndUpdate(
      { email: normalizedEmail },
      { $set: pendingRegistration },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    )
    try {
      await emailService.sendVerificationCode(normalizedEmail, verificationCode)
    } catch (error) {
      await PendingRegistration.deleteOne({ email: normalizedEmail })
      throw error
    }

    return res.status(202).json({ message: 'A verification code has been sent to your email.' })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'An account with that email already exists.' })
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Registration details are invalid.' })
    }
    return next(error)
  }
})

router.post('/verify-email', verificationRequestLimit, async (req, res, next) => {
  try {
    const { email, code } = req.body ?? {}
    if (typeof email !== 'string' || !email.trim() || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'A valid email and 6-digit verification code are required.' })
    }
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Authentication is not configured.' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const pending = await PendingRegistration.findOne({ email: normalizedEmail }).select('+codeHash')
    if (!pending || pending.expiresAt <= new Date()) {
      return res.status(400).json({ error: 'The verification code is invalid or expired. Please sign up again.' })
    }
    if (pending.attempts >= maxVerificationAttempts) {
      return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' })
    }

    const expectedHash = Buffer.from(pending.codeHash, 'hex')
    const actualHash = Buffer.from(hashVerificationCode(normalizedEmail, code), 'hex')
    if (expectedHash.length !== actualHash.length || !crypto.timingSafeEqual(expectedHash, actualHash)) {
      pending.attempts += 1
      await pending.save()
      return res.status(400).json({ error: 'The verification code is incorrect.' })
    }

    const user = await User.create({
      firstName: pending.firstName,
      lastName: pending.lastName,
      email: pending.email,
      passwordHash: pending.passwordHash,
    })
    await PendingRegistration.deleteOne({ _id: pending._id })
    const role = user.appRole
    const token = jwt.sign({ sub: user.id, role }, process.env.JWT_SECRET, { expiresIn: tokenLifetime })
    return res.status(201).json({ firstName: user.firstName, lastName: user.lastName, role, token })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'An account with that email already exists.' })
    }
    return next(error)
  }
})

router.post('/resend-verification', verificationRequestLimit, async (req, res, next) => {
  try {
    const { email } = req.body ?? {}
    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email is required.' })
    }
    const normalizedEmail = email.trim().toLowerCase()
    const pending = await PendingRegistration.findOne({ email: normalizedEmail })
    if (!pending) return res.status(404).json({ error: 'No pending signup found. Please sign up again.' })

    const verificationCode = createVerificationCode()
    pending.codeHash = hashVerificationCode(normalizedEmail, verificationCode)
    pending.expiresAt = new Date(Date.now() + verificationLifetimeMs)
    pending.attempts = 0
    await pending.save()
    await emailService.sendVerificationCode(normalizedEmail, verificationCode)
    return res.status(202).json({ message: 'A new verification code has been sent.' })
  } catch (error) {
    return next(error)
  }
})

module.exports = router
