const express = require('express')
const requireAuth = require('../middleware/requireAuth')
const Membership = require('../models/Membership')
const User = require('../models/User')
const { accessFor, removeMembership } = require('../services/clubAccess')
const { assertAdministrator } = require('../services/clubRoles')
const passwordService = require('../services/passwordService')
const passwordValidationService = require('../services/passwordValidationService')
const { issueCode } = require('../services/checkInCodes')

const router = express.Router()
const editableFields = new Set([
  'firstName',
  'lastName',
  'email',
  'phoneNumber',
  'password',
  'currentPassword',
])

router.get('/me', requireAuth, (req, res) => {
  return res.status(200).json({
    id: req.user.id,
    firstName: req.user.firstName,
    lastName: req.user.lastName,
    email: req.user.email,
    phoneNumber: req.user.phoneNumber,
    role: req.user.appRole,
  })
})

router.get('/me/check-in-code', requireAuth, (req, res) => {
  const { firstName, lastName, email } = req.user
  const qr = issueCode({ kind: 'attendee', userId: req.user.id })
  res.set('Cache-Control', 'no-store').json({
    ...qr,
    attendee: { name: firstName + ' ' + lastName, email },
  })
})

router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const updates = req.body
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return res
        .status(400)
        .json({ error: 'A valid profile update is required.' })
    }

    const fields = Object.keys(updates)
    if (fields.length === 0) {
      return res
        .status(400)
        .json({ error: 'At least one profile field must be provided.' })
    }
    if (fields.some((field) => !editableFields.has(field))) {
      return res
        .status(400)
        .json({ error: 'One or more fields cannot be updated.' })
    }

    for (const field of ['firstName', 'lastName', 'email']) {
      if (
        Object.hasOwn(updates, field) &&
        (typeof updates[field] !== 'string' || !updates[field].trim())
      ) {
        return res
          .status(400)
          .json({ error: `${field} must be a non-empty string.` })
      }
    }
    if (
      Object.hasOwn(updates, 'phoneNumber') &&
      updates.phoneNumber !== null &&
      typeof updates.phoneNumber !== 'string'
    ) {
      return res
        .status(400)
        .json({ error: 'phoneNumber must be a string or null.' })
    }
    if (
      Object.hasOwn(updates, 'password') &&
      !passwordValidationService.isValid(updates.password)
    ) {
      return res.status(400).json({
        error:
          'Password must be at least 8 characters and include at least one number and one special symbol.',
      })
    }
    if (Object.hasOwn(updates, 'password')) {
      const account = await User.findById(req.user._id).select('+passwordHash')
      if (
        typeof updates.currentPassword !== 'string' ||
        !account?.passwordHash ||
        !(await passwordService.verifyPassword(
          updates.currentPassword,
          account.passwordHash,
        ))
      ) {
        return res.status(400).json({ error: 'Current password is incorrect.' })
      }
    } else if (Object.hasOwn(updates, 'currentPassword')) {
      return res.status(400).json({ error: 'Enter a new password.' })
    }

    if (Object.hasOwn(updates, 'firstName'))
      req.user.firstName = updates.firstName.trim()
    if (Object.hasOwn(updates, 'lastName'))
      req.user.lastName = updates.lastName.trim()
    if (Object.hasOwn(updates, 'email'))
      req.user.email = updates.email.trim().toLowerCase()
    if (Object.hasOwn(updates, 'phoneNumber'))
      req.user.phoneNumber = updates.phoneNumber?.trim() || null
    if (Object.hasOwn(updates, 'password')) {
      req.user.$inc('mobileSessionVersion', 1)
      req.user.passwordHash = await passwordService.hashPassword(
        updates.password,
      )
    }

    await req.user.save()
    return res.status(200).json({
      id: req.user.id,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      email: req.user.email,
      phoneNumber: req.user.phoneNumber,
      role: req.user.appRole,
    })
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ error: 'An account with that email already exists.' })
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Profile details are invalid.' })
    }
    return next(error)
  }
})

router.delete('/me', requireAuth, async (req, res, next) => {
  try {
    const memberships = await Membership.find({ userId: req.user._id })
    for (const membership of memberships) {
      const access = await accessFor(membership.organizationId)
      const roles = access.roles.map((role) => ({
        ...role,
        memberIds: role.memberIds.filter((id) => !id.equals(membership._id)),
      }))
      if (
        roles.some(
          (role, index) =>
            role.memberIds.length !== access.roles[index].memberIds.length,
        )
      ) {
        assertAdministrator(roles)
      }
    }
    for (const membership of memberships)
      await removeMembership(membership, req.user)
    await req.user.deleteOne()
    return res.status(204).end()
  } catch (error) {
    return next(error)
  }
})

module.exports = router
