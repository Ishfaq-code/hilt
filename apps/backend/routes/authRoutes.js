const express = require('express')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const passwordService = require('../services/passwordService')
const passwordValidationService = require('../services/passwordValidationService')

const router = express.Router()
const tokenLifetime = '1h'

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

router.post('/register', async (req, res, next) => {
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

    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      passwordHash: await passwordService.hashPassword(password),
    })
    const role = user.appRole
    const token = jwt.sign({ sub: user.id, role }, process.env.JWT_SECRET, { expiresIn: tokenLifetime })

    return res.status(201).json({ firstName: user.firstName, lastName: user.lastName, role, token })
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

module.exports = router
