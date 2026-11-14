const express = require('express')
const mongoose = require('mongoose')
const Membership = require('../models/Membership')
const Organization = require('../models/Organization')
const requireAppAdmin = require('../middleware/requireAppAdmin')
const requireAuth = require('../middleware/requireAuth')
const requireOrganizationAdmin = require('../middleware/requireOrganizationAdmin')

const router = express.Router()
const editableFields = new Set(['organizationRole', 'isPaid'])

router.get('/', requireAuth, requireAppAdmin, async (req, res, next) => {
  try {
    const memberships = await Membership.find({})
    return res.status(200).json(memberships)
  } catch (error) {
    return next(error)
  }
})

router.get('/organization/:organizationId', requireAuth, requireOrganizationAdmin, async (req, res, next) => {
  try {
    const memberships = await Membership.find({ organizationId: req.params.organizationId })
    return res.status(200).json(memberships)
  } catch (error) {
    return next(error)
  }
})

router.get('/:membershipId', requireAuth, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.membershipId)) {
    return res.status(404).json({ error: 'Membership not found.' })
  }

  try {
    const membership = await Membership.findById(req.params.membershipId)
    if (!membership) return res.status(404).json({ error: 'Membership not found.' })
    if (!membership.userId.equals(req.user._id)) {
      return res.status(403).json({ error: 'You can only access your own membership.' })
    }
    return res.status(200).json(membership)
  } catch (error) {
    return next(error)
  }
})

router.post('/', requireAuth, async (req, res, next) => {
  const body = req.body
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'A valid organizationId is required.' })
  }
  if (Object.keys(body).some((field) => field !== 'organizationId')) {
    return res.status(400).json({ error: 'Only organizationId may be provided.' })
  }
  if (typeof body.organizationId !== 'string' || !mongoose.isValidObjectId(body.organizationId)) {
    return res.status(400).json({ error: 'A valid organizationId is required.' })
  }

  try {
    const organization = await Organization.findById(body.organizationId)
    if (!organization) return res.status(404).json({ error: 'Organization not found.' })
    const membership = await Membership.create({
      userId: req.user._id,
      organizationId: organization._id,
      isPaid: organization.membershipFee === 0,
    })
    return res.status(201).json(membership)
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'You already have a membership in this organization.' })
    }
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ error: 'Membership details are invalid.' })
    }
    return next(error)
  }
})

router.patch('/:membershipId', requireAuth, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.membershipId)) {
    return res.status(404).json({ error: 'Membership not found.' })
  }

  try {
    const membership = await Membership.findById(req.params.membershipId)
    if (!membership) return res.status(404).json({ error: 'Membership not found.' })

    if (req.user.appRole !== 'admin') {
      const isOfficer = await Membership.exists({
        userId: req.user._id,
        organizationId: membership.organizationId,
        organizationRole: { $in: ['officer', 'owner'] },
      })
      if (!isOfficer) return res.status(403).json({ error: 'Organization officer access is required.' })
    }

    const updates = req.body
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return res.status(400).json({ error: 'A valid membership update is required.' })
    }
    const fields = Object.keys(updates)
    if (!fields.length) return res.status(400).json({ error: 'At least one membership field must be provided.' })
    if (fields.some((field) => !editableFields.has(field))) {
      return res.status(400).json({ error: 'One or more membership fields cannot be updated.' })
    }

    for (const field of fields) membership.set(field, updates[field])
    await membership.save()
    return res.status(200).json(membership)
  } catch (error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ error: 'Membership details are invalid.' })
    }
    return next(error)
  }
})

router.delete('/:membershipId', requireAuth, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.membershipId)) {
    return res.status(404).json({ error: 'Membership not found.' })
  }

  try {
    const membership = await Membership.findById(req.params.membershipId)
    if (!membership) return res.status(404).json({ error: 'Membership not found.' })

    const isOwner = membership.userId.equals(req.user._id)
    if (!isOwner && req.user.appRole !== 'admin') {
      const isOfficer = await Membership.exists({
        userId: req.user._id,
        organizationId: membership.organizationId,
        organizationRole: { $in: ['officer', 'owner'] },
      })
      if (!isOfficer) return res.status(403).json({ error: 'You cannot delete this membership.' })
    }

    await membership.deleteOne()
    return res.status(204).end()
  } catch (error) {
    return next(error)
  }
})

module.exports = router
