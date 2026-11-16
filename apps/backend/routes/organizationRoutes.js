const express = require('express')
const mongoose = require('mongoose')
const ClubReport = require('../models/ClubReport')
const Membership = require('../models/Membership')
const EventAttendance = require('../models/EventAttendance')
const Organization = require('../models/Organization')
const User = require('../models/User')
const requireAppAdmin = require('../middleware/requireAppAdmin')
const requireAuth = require('../middleware/requireAuth')
const requireClubPermission = require('../middleware/requireClubPermission')
const ClubAccess = require('../models/ClubAccess')
const { accessFor, createClub } = require('../services/clubAccess')
const { parseTags, withClubTags } = require('../services/tags')
const {
  parseApplicationRoles,
  permissionsFor,
} = require('../services/clubRoles')
const optionalAuth = require('../middleware/optionalAuth')
const eventDetails = require('../services/eventDetails')
const { uploads } = require('../middleware/uploads')
const {
  saveWithUploads,
  saveClubImages,
  deleteMedia,
  deleteUnusedClubImages,
} = require('../services/media')

const router = express.Router()
const editableFields = new Set([
  'name',
  'description',
  'tags',
  'profile',
  'membershipFee',
])

router.get('/', async (req, res, next) => {
  try {
    const organizations = await Organization.find(
      {},
      'name description tags category profile assets membershipFee',
    ).lean()
    return res.status(200).json(organizations.map(withClubTags))
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

    const result = withClubTags(organization.toObject())
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

router.post('/:organizationId/reports', requireAuth, async (req, res) => {
  const { organizationId } = req.params
  if (!mongoose.isValidObjectId(organizationId)) {
    return res.status(404).json({ error: 'Club not found.' })
  }

  const reason =
    typeof req.body?.reason === 'string' ? req.body.reason.trim() : ''
  if (!reason || reason.length > 2000) {
    return res
      .status(400)
      .json({ error: 'Enter a reason of up to 2,000 characters.' })
  }

  const club = await Organization.findById(organizationId, 'name').lean()
  if (!club) return res.status(404).json({ error: 'Club not found.' })

  await ClubReport.create({
    organizationId,
    reporterId: req.user._id,
    clubName: club.name,
    reason,
  })
  return res.status(201).json({ message: 'Report sent.' })
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
  '/:organizationId/manage/statistics',
  requireAuth,
  requireClubPermission('members', 'events', 'attendance'),
  async (req, res, next) => {
    try {
      const organization = await Organization.findById(req.params.organizationId)
        .select('name membershipFee events')
        .lean()
      if (!organization)
        return res.status(404).json({ error: 'Club not found.' })

      const [membershipStats, attendanceStats] = await Promise.all([
        Membership.aggregate([
          { $match: { organizationId: organization._id } },
          {
            $group: {
              _id: null,
              totalMembers: { $sum: 1 },
              paidMembers: { $sum: { $cond: ['$isPaid', 1, 0] } },
            },
          },
        ]),
        EventAttendance.aggregate([
          {
            $match: {
              organizationId: organization._id,
              $or: [{ reversedAt: null }, { reversedAt: { $exists: false } }],
            },
          },
          { $group: { _id: '$eventId', attendance: { $sum: 1 } } },
        ]),
      ])
      const { totalMembers = 0, paidMembers = 0 } = membershipStats[0] || {}
      const eventAttendance = new Map(
        attendanceStats.map((item) => [String(item._id), item.attendance]),
      )
      return res.status(200).json({
        organizationId: organization._id,
        name: organization.name,
        membershipFee: organization.membershipFee || 0,
        totalMembers,
        paidMembers,
        unpaidMembers: totalMembers - paidMembers,
        currentRevenue: paidMembers * (organization.membershipFee || 0),
        projectedRevenue: totalMembers * (organization.membershipFee || 0),
        eventAttendance: (organization.events || [])
          .filter((event) => event.status !== 'draft')
          .map((event) => ({
            eventId: event._id,
            name: event.name || 'Untitled event',
            attendance: eventAttendance.get(String(event._id)) || 0,
          })),
      })
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
  uploads('banner'),
  async (req, res, next) => {
    try {
      const organization = await Organization.findById(
        req.params.organizationId,
      )
      if (!organization)
        return res.status(404).json({ error: 'Club not found.' })
      const event = organization.events.create(eventDetails(req.body))
      await saveWithUploads(
        `clubs/${organization.id}/events/${event.id}`,
        req.uploads,
        async ({ banner }) => {
          if (banner) event.banner = banner
          organization.events.push(event)
          await organization.save()
        },
      )
      return res.status(201).json(event)
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
  uploads('banner'),
  async (req, res, next) => {
    try {
      const organization = await Organization.findById(
        req.params.organizationId,
      )
      const event = organization?.events.id(req.params.eventId)
      if (!event) return res.status(404).json({ error: 'Event not found.' })
      const previousBanner = event.banner
      const details = eventDetails(
        req.uploads.banner && (!req.body || !Object.keys(req.body).length)
          ? { status: event.status }
          : req.body,
        event,
      )
      const prefix = `clubs/${organization.id}/events/${event.id}`
      await saveWithUploads(prefix, req.uploads, async ({ banner }) => {
        event.set(details)
        if (banner) event.banner = banner
        await organization.save()
      })
      if (previousBanner !== event.banner)
        await deleteMedia(prefix, [previousBanner])
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
      const event = organization?.events.id(req.params.eventId)
      if (!event) return res.status(404).json({ error: 'Event not found.' })
      event.deleteOne()
      await organization.save()
      await deleteMedia(`clubs/${organization.id}/events/${event.id}`, [
        event.banner,
      ])
      return res.status(204).end()
    } catch (error) {
      return next(error)
    }
  },
)

router.post(
  '/',
  requireAuth,
  requireAppAdmin,
  uploads('icon', 'banner'),
  async (req, res, next) => {
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
      const details = Object.fromEntries(
        fields.map((field) => [field, body[field]]),
      )
      if (Object.hasOwn(details, 'tags')) {
        details.tags = parseTags(details.tags)
        if (!details.tags)
          return res
            .status(400)
            .json({ error: 'Tags must be a list of names.' })
      }
      if (!req.uploads.icon || !req.uploads.banner)
        return res.status(400).json({ error: 'Upload a club icon and banner.' })

      const organization = new Organization(details)
      const roleSetup = parseApplicationRoles(body.roleSetup)
      await organization.validate()
      await saveClubImages(organization.id, req.uploads, [], (assets) => {
        organization.assets = assets
        return createClub(organization, initialUserId, roleSetup)
      })
      return res.status(201).json(organization)
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

router.patch(
  '/:organizationId',
  requireAuth,
  requireClubPermission('settings'),
  uploads('icon', 'banner'),
  async (req, res, next) => {
    try {
      const updates = req.body ?? {}
      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        return res
          .status(400)
          .json({ error: 'A valid organization update is required.' })
      }

      const fields = Object.keys(updates)
      if (fields.length === 0 && !Object.keys(req.uploads).length) {
        return res
          .status(400)
          .json({ error: 'At least one organization field must be provided.' })
      }
      if (fields.some((field) => !editableFields.has(field))) {
        return res
          .status(400)
          .json({ error: 'One or more organization fields cannot be updated.' })
      }
      if (Object.hasOwn(updates, 'tags')) {
        updates.tags = parseTags(updates.tags)
        if (!updates.tags)
          return res
            .status(400)
            .json({ error: 'Tags must be a list of names.' })
      }
      if (
        Object.hasOwn(updates, 'profile') &&
        updates.profile &&
        (typeof updates.profile !== 'string' ||
          !/^https?:\/\//i.test(updates.profile))
      ) {
        return res.status(400).json({
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
      if (Object.keys(req.uploads).length) {
        await saveClubImages(
          organization.id,
          req.uploads,
          organization.assets,
          (assets) => {
            organization.assets = assets
            return organization.save()
          },
        )
      } else {
        await organization.save()
      }
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
      await deleteUnusedClubImages(
        organization.id,
        organization.assets.map((asset) => asset.link),
      )
      await deleteMedia(
        `clubs/${organization.id}`,
        organization.events.map((event) => event.banner),
      )
      return res.status(204).end()
    } catch (error) {
      return next(error)
    }
  },
)

module.exports = router
