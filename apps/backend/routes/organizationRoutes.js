const express = require('express')
const mongoose = require('mongoose')
const Membership = require('../models/Membership')
const Organization = require('../models/Organization')
const User = require('../models/User')
const requireAppAdmin = require('../middleware/requireAppAdmin')
const requireAuth = require('../middleware/requireAuth')
const requireOrganizationAdmin = require('../middleware/requireOrganizationAdmin')

const router = express.Router()
const editableFields = new Set(['name', 'description', 'assets', 'membershipFee', 'events'])

router.get('/', async (req, res, next) => {
  try {
    const organizations = await Organization.find({}, 'name description assets').lean()
    return res.status(200).json(organizations)
  } catch (error) {
    return next(error)
  }
})

router.get('/:organizationId', requireAuth, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.organizationId)) {
    return res.status(404).json({ error: 'Organization not found.' })
  }

  try {
    const organization = await Organization.findById(req.params.organizationId)
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found.' })
    }

    const membership = await Membership.exists({
      userId: req.user._id,
      organizationId: organization._id,
    })
    if (!membership) {
      return res.status(403).json({ error: 'Organization membership is required.' })
    }

    return res.status(200).json(organization)
  } catch (error) {
    return next(error)
  }
})

router.post('/', requireAuth, requireAppAdmin, async (req, res, next) => {
  try {
    const body = req.body
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ error: 'Organization details are required.' })
    }
    if (typeof body.ownerUserId !== 'string' || !mongoose.isValidObjectId(body.ownerUserId)) {
      return res.status(400).json({ error: 'A valid ownerUserId is required.' })
    }

    const owner = await User.findById(body.ownerUserId)
    if (!owner) {
      return res.status(400).json({ error: 'The specified organization owner does not exist.' })
    }

    const fields = Object.keys(body).filter((field) => field !== 'ownerUserId')
    if (fields.some((field) => !editableFields.has(field))) {
      return res.status(400).json({ error: 'One or more organization fields cannot be set.' })
    }

    const organization = new Organization(Object.fromEntries(fields.map((field) => [field, body[field]])))
    await organization.save()
    try {
      await Membership.create({
        userId: owner._id,
        organizationId: organization._id,
        organizationRole: 'owner',
      })
    } catch (error) {
      await organization.deleteOne()
      throw error
    }

    return res.status(201).json(organization)
  } catch (error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ error: 'Organization details are invalid.' })
    }
    return next(error)
  }
})

router.patch('/:organizationId', requireAuth, requireOrganizationAdmin, async (req, res, next) => {
  try {
    const updates = req.body
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return res.status(400).json({ error: 'A valid organization update is required.' })
    }

    const fields = Object.keys(updates)
    if (fields.length === 0) {
      return res.status(400).json({ error: 'At least one organization field must be provided.' })
    }
    if (fields.some((field) => !editableFields.has(field))) {
      return res.status(400).json({ error: 'One or more organization fields cannot be updated.' })
    }

    const organization = await Organization.findById(req.params.organizationId)
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found.' })
    }

    for (const field of fields) organization.set(field, updates[field])
    await organization.save()
    return res.status(200).json(organization)
  } catch (error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ error: 'Organization details are invalid.' })
    }
    return next(error)
  }
})

router.delete('/:organizationId', requireAuth, requireAppAdmin, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.organizationId)) {
    return res.status(404).json({ error: 'Organization not found.' })
  }

  try {
    const organization = await Organization.findByIdAndDelete(req.params.organizationId)
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found.' })
    }
    await Membership.deleteMany({ organizationId: organization._id })
    return res.status(204).end()
  } catch (error) {
    return next(error)
  }
})

module.exports = router
