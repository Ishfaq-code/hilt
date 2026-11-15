const express = require('express')
const mongoose = require('mongoose')
const Membership = require('../models/Membership')
const Organization = require('../models/Organization')
const User = require('../models/User')
const requireAppAdmin = require('../middleware/requireAppAdmin')
const requireAuth = require('../middleware/requireAuth')
const requireClubPermission = require('../middleware/requireClubPermission')
const ClubAccess = require('../models/ClubAccess')
const { accessFor, createClub } = require('../services/clubAccess')
const {
  parseApplicationRoles,
  permissionsFor,
} = require('../services/clubRoles')
const optionalAuth = require('../middleware/optionalAuth')
const eventDetails = require('../services/eventDetails')

const router = express.Router()
const editableFields = new Set([
  'name',
  'description',
  'category',
  'profile',
  'assets',
  'membershipFee',
])

router.get('/', async (req, res, next) => {
  try {
    const organizations = await Organization.find(
      {},
      'name description category profile assets membershipFee',
    ).lean()
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
    const hasMembership =
      req.user &&
      (req.user.appRole === 'admin' ||
        (await Membership.exists({
          userId: req.user._id,
          organizationId: organization._id,
        })))
    result.events = result.events.filter(
      (event) => event.status !== 'draft' && (hasMembership || !event.private),
    )
    return res.status(200).json(result)
  } catch (error) {
    return next(error)
  }
})

router.get(
  '/:organizationId/members',
  requireAuth,
  requireClubPermission('members', 'roles'),
  async (req, res, next) => {
    try {
      const memberships = await Membership.find({
        organizationId: req.params.organizationId,
      })
        .populate('userId', 'firstName lastName email')
        .sort({ createdAt: 1 })
      const access = await accessFor(req.params.organizationId)
      return res.status(200).json(
        memberships
          .filter((membership) => membership.userId)
          .map((membership) => {
            const { organizationRole, ...member } = membership.toObject()
            const roles = access.roles.filter((role) =>
              role.memberIds.some((id) => id.equals(member._id)),
            )
            return {
              ...member,
              roles: roles.map(({ _id, name }) => ({ _id, name })),
              permissions: permissionsFor(roles, member._id),
            }
          }),
      )
    } catch (error) {
      return next(error)
    }
  },
)

router.get(
  '/:organizationId/statistics',
  requireAuth,
  requireAppAdmin,
  async (req, res, next) => {
    try {
      const organization = await Organization.findById(
        req.params.organizationId,
      ).lean()
      if (!organization)
        return res.status(404).json({ error: 'Club not found.' })
      const [totalMembers, paidMembers] = await Promise.all([
        Membership.countDocuments({ organizationId: organization._id }),
        Membership.countDocuments({
          organizationId: organization._id,
          isPaid: true,
        }),
      ])
      return res.status(200).json({
        organizationId: organization._id,
        name: organization.name,
        totalMembers,
        paidMembers,
        events: organization.events?.length || 0,
      })
    } catch (error) {
      return next(error)
    }
  },
)

router.get(
  '/:organizationId/manage/events',
  requireAuth,
  requireClubPermission('events', 'attendance'),
  async (req, res) => {
    const organization = await Organization.findById(req.params.organizationId)
    res.json(
      req.clubPermissions.includes('events')
        ? organization.events
        : organization.events.filter((event) => event.status !== 'draft'),
    )
  },
)

router.post(
  '/:organizationId/events',
  requireAuth,
  requireClubPermission('events'),
  async (req, res, next) => {
    try {
      const organization = await Organization.findById(
        req.params.organizationId,
      )
      organization.events.push(eventDetails(req.body))
      await organization.save()
      return res.status(201).json(organization.events.at(-1))
    } catch (error) {
      if (error.status === 400)
        return res.status(400).json({ error: error.message })
      if (error.name === 'ValidationError' || error.name === 'CastError')
        return res.status(400).json({ error: 'Event details are invalid.' })
      return next(error)
    }
  },
)

router.patch(
  '/:organizationId/events/:eventId',
  requireAuth,
  requireClubPermission('events'),
  async (req, res, next) => {
    try {
      const organization = await Organization.findById(
        req.params.organizationId,
      )
      const event = organization.events.id(req.params.eventId)
      if (!event) return res.status(404).json({ error: 'Event not found.' })
      event.set(eventDetails(req.body, event))
      await organization.save()
      return res.status(200).json(event)
    } catch (error) {
      if (error.status === 400)
        return res.status(400).json({ error: error.message })
      if (error.name === 'ValidationError' || error.name === 'CastError')
        return res.status(400).json({ error: 'Event details are invalid.' })
      return next(error)
    }
  },
)

router.delete(
  '/:organizationId/events/:eventId',
  requireAuth,
  requireClubPermission('events'),
  async (req, res, next) => {
    try {
      const organization = await Organization.findById(
        req.params.organizationId,
      )
      const event = organization.events.id(req.params.eventId)
      if (!event) return res.status(404).json({ error: 'Event not found.' })
      event.deleteOne()
      await organization.save()
      return res.status(204).end()
    } catch (error) {
      return next(error)
    }
  },
)

router.post('/', requireAuth, requireAppAdmin, async (req, res, next) => {
  try {
    const body = req.body
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res
        .status(400)
        .json({ error: 'Organization details are required.' })
    }
    const initialUserId = body.initialMemberUserId ?? body.ownerUserId
    if (
      !mongoose.isObjectIdOrHexString(initialUserId) ||
      !(await User.exists({ _id: initialUserId }))
    ) {
      return res
        .status(400)
        .json({ error: 'Choose an existing user as the initial member.' })
    }
    const fields = Object.keys(body).filter(
      (field) =>
        !['initialMemberUserId', 'ownerUserId', 'roleSetup'].includes(field),
    )
    if (fields.some((field) => !editableFields.has(field))) {
      return res
        .status(400)
        .json({ error: 'One or more club fields cannot be set.' })
    }
    const organization = new Organization(
      Object.fromEntries(fields.map((field) => [field, body[field]])),
    )
    await createClub(
      organization,
      initialUserId,
      parseApplicationRoles(body.roleSetup),
    )
    return res.status(201).json(organization)
  } catch (error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res
        .status(400)
        .json({ error: 'Organization details are invalid.' })
    }
    return next(error)
  }
})

router.patch(
  '/:organizationId',
  requireAuth,
  requireClubPermission('settings'),
  async (req, res, next) => {
    try {
      const updates = req.body
      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        return res
          .status(400)
          .json({ error: 'A valid organization update is required.' })
      }

      const fields = Object.keys(updates)
      if (fields.length === 0) {
        return res
          .status(400)
          .json({ error: 'At least one organization field must be provided.' })
      }
      if (fields.some((field) => !editableFields.has(field))) {
        return res
          .status(400)
          .json({ error: 'One or more organization fields cannot be updated.' })
      }
      if (
        Object.hasOwn(updates, 'profile') &&
        updates.profile &&
        (typeof updates.profile !== 'string' ||
          !/^https?:\/\//i.test(updates.profile))
      ) {
        return res
          .status(400)
          .json({
            error: 'Organization website must start with http:// or https://.',
          })
      }
      if (
        Object.hasOwn(updates, 'membershipFee') &&
        (!Number.isFinite(updates.membershipFee) || updates.membershipFee < 0)
      ) {
        return res
          .status(400)
          .json({ error: 'Membership dues must be a non-negative number.' })
      }

      const organization = await Organization.findById(
        req.params.organizationId,
      )
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found.' })
      }

      for (const field of fields) organization.set(field, updates[field])
      await organization.save()
      return res.status(200).json(organization)
    } catch (error) {
      if (error.name === 'ValidationError' || error.name === 'CastError') {
        return res
          .status(400)
          .json({ error: 'Organization details are invalid.' })
      }
      return next(error)
    }
  },
)

router.delete(
  '/:organizationId',
  requireAuth,
  requireAppAdmin,
  async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.organizationId)) {
      return res.status(404).json({ error: 'Organization not found.' })
    }

    try {
      const organization = await Organization.findByIdAndDelete(
        req.params.organizationId,
      )
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found.' })
      }
      await Membership.deleteMany({ organizationId: organization._id })
      await ClubAccess.deleteOne({ _id: organization._id })
      return res.status(204).end()
    } catch (error) {
      return next(error)
    }
  },
)

module.exports = router
