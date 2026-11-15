const express = require('express')
const mongoose = require('mongoose')
const Membership = require('../models/Membership')
const Organization = require('../models/Organization')
const User = require('../models/User')
const requireAppAdmin = require('../middleware/requireAppAdmin')
const requireAuth = require('../middleware/requireAuth')
const requireOrganizationAdmin = require('../middleware/requireOrganizationAdmin')
const optionalAuth = require('../middleware/optionalAuth')

const router = express.Router()
const editableFields = new Set(['name', 'description', 'category', 'profile', 'assets', 'membershipFee', 'events'])

router.get('/', async (req, res, next) => {
  try {
    const organizations = await Organization.find({}, 'name description category profile assets membershipFee').lean()
    return res.status(200).json(organizations)
  } catch (error) {
    return next(error)
  }
})

router.get('/:organizationId', optionalAuth, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.organizationId)) {
    return res.status(404).json({ error: 'Organization not found.' })
  }

  try {
    const organization = await Organization.findById(req.params.organizationId)
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found.' })
    }

    const result = organization.toObject()
    const hasMembership = req.user && (req.user.appRole === 'admin' || await Membership.exists({ userId: req.user._id, organizationId: organization._id }))
    if (!hasMembership) result.events = result.events.filter((event) => !event.private)
    return res.status(200).json(result)
  } catch (error) {
    return next(error)
  }
})

router.get('/:organizationId/members', requireAuth, requireOrganizationAdmin, async (req, res, next) => {
  try {
    const memberships = await Membership.find({ organizationId: req.params.organizationId })
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: 1 })
    return res.status(200).json(memberships)
  } catch (error) { return next(error) }
})

router.get('/:organizationId/statistics', requireAuth, requireOrganizationAdmin, async (req, res, next) => {
  try {
    const organization = await Organization.findById(req.params.organizationId).lean()
    const memberships = await Membership.aggregate([
      { $match: { organizationId: new mongoose.Types.ObjectId(req.params.organizationId) } },
      { $group: { _id: '$organizationRole', count: { $sum: 1 }, paid: { $sum: { $cond: ['$isPaid', 1, 0] } } } },
    ])
    const roles = Object.fromEntries(memberships.map((item) => [item._id, item.count]))
    return res.status(200).json({
      organizationId: organization._id,
      name: organization.name,
      totalMembers: memberships.reduce((sum, item) => sum + item.count, 0),
      paidMembers: memberships.reduce((sum, item) => sum + item.paid, 0),
      events: organization.events?.length || 0,
      roles,
    })
  } catch (error) { return next(error) }
})

router.post('/:organizationId/events', requireAuth, requireOrganizationAdmin, async (req, res, next) => {
  try {
    const { name, description, startDatetime, endDatetime, place, type, private: isPrivate, banner } = req.body || {}
    if (typeof name !== 'string' || !name.trim() || !startDatetime || !endDatetime ||
      !Number.isFinite(Date.parse(startDatetime)) || !Number.isFinite(Date.parse(endDatetime)) ||
      Date.parse(endDatetime) <= Date.parse(startDatetime)) {
      return res.status(400).json({ error: 'Provide an event name and a valid end time after the start time.' })
    }
    const organization = await Organization.findById(req.params.organizationId)
    organization.events.push({ name: name.trim(), description, startDatetime, endDatetime, place, type, private: Boolean(isPrivate), banner })
    await organization.save()
    return res.status(201).json(organization.events.at(-1))
  } catch (error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ error: 'Event details are invalid.' })
    return next(error)
  }
})

router.patch('/:organizationId/events/:eventId', requireAuth, requireOrganizationAdmin, async (req, res, next) => {
  try {
    const fields = Object.keys(req.body || {})
    if (!fields.length || fields.some((field) => !['name', 'description', 'startDatetime', 'endDatetime', 'place', 'type', 'private', 'banner'].includes(field))) {
      return res.status(400).json({ error: 'Provide valid event fields to update.' })
    }
    const organization = await Organization.findById(req.params.organizationId)
    const event = organization.events.id(req.params.eventId)
    if (!event) return res.status(404).json({ error: 'Event not found.' })
    for (const field of fields) event.set(field, req.body[field])
    if (event.endDatetime <= event.startDatetime) return res.status(400).json({ error: 'Event end time must be after its start time.' })
    await organization.save()
    return res.status(200).json(event)
  } catch (error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ error: 'Event details are invalid.' })
    return next(error)
  }
})

router.delete('/:organizationId/events/:eventId', requireAuth, requireOrganizationAdmin, async (req, res, next) => {
  try {
    const organization = await Organization.findById(req.params.organizationId)
    const event = organization.events.id(req.params.eventId)
    if (!event) return res.status(404).json({ error: 'Event not found.' })
    event.deleteOne()
    await organization.save()
    return res.status(204).end()
  } catch (error) { return next(error) }
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
    if (Object.hasOwn(updates, 'profile') && updates.profile && (typeof updates.profile !== 'string' || !/^https?:\/\//i.test(updates.profile))) {
      return res.status(400).json({ error: 'Organization website must start with http:// or https://.' })
    }
    if (Object.hasOwn(updates, 'membershipFee') && (!Number.isFinite(updates.membershipFee) || updates.membershipFee < 0)) {
      return res.status(400).json({ error: 'Membership dues must be a non-negative number.' })
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
