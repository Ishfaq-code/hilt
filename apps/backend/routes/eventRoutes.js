const express = require('express')
const { isValidObjectId } = require('mongoose')
const Attendance = require('../models/EventAttendance')
const Rsvp = require('../models/EventRsvp')
const Membership = require('../models/Membership')
const Organization = require('../models/Organization')
const User = require('../models/User')
const optionalAuth = require('../middleware/optionalAuth')
const requireAuth = require('../middleware/requireAuth')
const requireOrganizationAdmin = require('../middleware/requireOrganizationAdmin')
const { issueCode, readCode } = require('../services/checkInCodes')

const router = express.Router({ mergeParams: true })

async function loadEvent(req, res, next) {
  const { organizationId, eventId } = req.params
  if (!isValidObjectId(organizationId) || !isValidObjectId(eventId)) {
    return res.status(404).json({ error: 'Event not found.' })
  }

  const organization = await Organization.findOne(
    { _id: organizationId, 'events._id': eventId },
    { 'events.$': 1 },
  )
  const event = organization?.events[0]
  if (!event || event.status === 'draft')
    return res.status(404).json({ error: 'Event not found.' })
  req.event = event
  req.eventScope = { organizationId: organization._id, eventId: event._id }
  next()
}

function canAttend(req, userId) {
  if (!req.event.private) return true
  if (!userId) return false
  return Membership.exists({
    organizationId: req.params.organizationId,
    userId,
  })
}

async function requireEventAccess(req, res, next) {
  if (!(await canAttend(req, req.user._id))) {
    return res
      .status(403)
      .json({ error: 'Join the club to access this event.' })
  }
  next()
}

function requireTracking(req, res, next) {
  if (!req.event.attendance.enabled) {
    return res
      .status(409)
      .json({ error: 'Attendance is not tracked for this event.' })
  }
  next()
}

function checkInDetails(record) {
  if (!record) return null
  const { checkedInAt, method, hadRsvp } = record
  return { checkedInAt, method, hadRsvp }
}

async function recordCheckIn(req, res, userId, method) {
  const filter = { ...req.eventScope, userId }
  const existing = await Attendance.findOne({ ...filter, reversedAt: null })
  if (existing) return res.json(checkInDetails(existing))

  const hadRsvp = Boolean(await Rsvp.exists(filter))
  if (!hadRsvp && !req.event.attendance.walkIns) {
    return res
      .status(409)
      .json({ error: 'This event only checks in people who RSVPed.' })
  }

  const fields = {
    checkedInAt: new Date(),
    checkedInBy: req.user._id,
    method,
    hadRsvp,
  }
  let record
  try {
    record = await Attendance.findOneAndUpdate(
      { ...filter, reversedAt: { $ne: null } },
      { $set: fields, $unset: { reversedAt: '', reversedBy: '' } },
      { upsert: true, returnDocument: 'after' },
    )
  } catch (error) {
    if (error.code !== 11000) throw error
    record = await Attendance.findOne({ ...filter, reversedAt: null })
    if (!record)
      return res.status(409).json({ error: 'Attendance changed. Try again.' })
  }
  return res.json(checkInDetails(record))
}

router.get('/', optionalAuth, loadEvent, async (req, res) => {
  if (req.user?.appRole !== 'admin' && !(await canAttend(req, req.user?._id))) {
    return res.json({ membersOnly: true })
  }
  res.json({ event: req.event })
})

router.get(
  '/participation',
  requireAuth,
  loadEvent,
  requireEventAccess,
  async (req, res) => {
    const filter = { ...req.eventScope, userId: req.user._id }
    const [rsvped, attendance] = await Promise.all([
      Rsvp.exists(filter),
      Attendance.findOne({ ...filter, reversedAt: null }).lean(),
    ])
    res.json({ rsvped: Boolean(rsvped), checkIn: checkInDetails(attendance) })
  },
)

router.put(
  '/rsvp',
  requireAuth,
  loadEvent,
  requireEventAccess,
  async (req, res) => {
    const { interested } = req.body || {}
    if (typeof interested !== 'boolean') {
      return res.status(400).json({ error: 'Choose whether to RSVP.' })
    }
    if (Date.now() >= req.event.startDatetime.getTime()) {
      return res.status(409).json({ error: 'RSVP closed.' })
    }

    const filter = { ...req.eventScope, userId: req.user._id }
    if (interested) {
      await Rsvp.updateOne(
        filter,
        { $setOnInsert: filter },
        { upsert: true },
      ).catch((error) => {
        if (error.code !== 11000) throw error
      })
    } else {
      await Rsvp.deleteOne(filter)
    }
    res.json({ rsvped: interested })
  },
)

router.post(
  '/check-in',
  requireAuth,
  loadEvent,
  requireEventAccess,
  requireTracking,
  async (req, res) => {
    const now = Date.now()
    if (
      now < req.event.startDatetime.getTime() ||
      now >= req.event.endDatetime.getTime()
    ) {
      return res.status(409).json({ error: 'Check-in is closed.' })
    }

    const { method, code } = req.body || {}
    if (method === 'event-qr' && req.event.attendance.eventQr) {
      const token = readCode(code, 'event')
      if (
        token?.eventId !== String(req.event._id) ||
        token.organizationId !== String(req.eventScope.organizationId)
      ) {
        return res
          .status(400)
          .json({ error: 'This event QR code is invalid or expired.' })
      }
    } else if (method !== 'self' || !req.event.attendance.self) {
      return res
        .status(403)
        .json({ error: 'This check-in method is unavailable.' })
    }
    return recordCheckIn(req, res, req.user._id, method)
  },
)

router.get(
  '/check-in-code',
  requireAuth,
  requireOrganizationAdmin,
  loadEvent,
  requireTracking,
  (req, res) => {
    if (!req.event.attendance.eventQr) {
      return res
        .status(403)
        .json({ error: 'Event QR check-in is unavailable.' })
    }
    res.set('Cache-Control', 'no-store').json(
      issueCode({
        kind: 'event',
        organizationId: String(req.eventScope.organizationId),
        eventId: String(req.event._id),
      }),
    )
  },
)

async function findAttendees(event, organizationId, search) {
  if (search.length < 2) return []

  const escaped = search.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
  const pattern = new RegExp(escaped, 'i')
  const name = { $concat: ['$firstName', ' ', '$lastName'] }
  const eligible = [{ 'memberships.0': { $exists: true } }]
  if (!event.private) {
    eligible.push({ 'rsvps.0': { $exists: true } })
    if (event.attendance.walkIns) eligible.push({ email: search.toLowerCase() })
  }

  return User.aggregate([
    {
      $match: {
        $or: [
          { email: pattern },
          { $expr: { $regexMatch: { input: name, regex: pattern } } },
        ],
      },
    },
    {
      $lookup: {
        from: Membership.collection.name,
        localField: '_id',
        foreignField: 'userId',
        pipeline: [{ $match: { organizationId } }, { $limit: 1 }],
        as: 'memberships',
      },
    },
    {
      $lookup: {
        from: Rsvp.collection.name,
        localField: '_id',
        foreignField: 'userId',
        pipeline: [
          { $match: { organizationId, eventId: event._id } },
          { $limit: 1 },
        ],
        as: 'rsvps',
      },
    },
    { $match: { $or: eligible } },
    { $sort: { lastName: 1, firstName: 1, _id: 1 } },
    { $limit: 10 },
    {
      $project: {
        firstName: 1,
        lastName: 1,
        email: 1,
        rsvped: { $gt: [{ $size: '$rsvps' }, 0] },
      },
    },
  ])
}

router.get(
  '/attendance',
  requireAuth,
  requireOrganizationAdmin,
  loadEvent,
  async (req, res) => {
    const { event } = req
    const filter = req.eventScope
    const search = String(req.query.q || '')
      .trim()
      .slice(0, 80)
    const { organizationId } = filter
    const rsvps = await Rsvp.countDocuments(filter)
    const people = await findAttendees(event, organizationId, search)
    if (!event.attendance.enabled) {
      return res.json({ tracked: false, rsvps, people })
    }

    const active = { ...filter, reversedAt: null }
    const [withRsvp, walkIns, records] = await Promise.all([
      Attendance.countDocuments({ ...active, hadRsvp: true }),
      Attendance.countDocuments({ ...active, hadRsvp: false }),
      search
        ? Attendance.find({
            ...active,
            userId: { $in: people.map((person) => person._id) },
          }).lean()
        : Attendance.find(active)
            .sort({ checkedInAt: -1 })
            .limit(10)
            .populate('userId', 'firstName lastName email')
            .lean(),
    ])
    const checkIns = new Map(
      records.map((record) => [String(record.userId), record]),
    )
    const attendees = search
      ? people.map((person) => ({
          ...person,
          checkIn: checkInDetails(checkIns.get(String(person._id))),
        }))
      : records
          .filter((record) => record.userId)
          .map((record) => ({
            ...record.userId,
            rsvped: record.hadRsvp,
            checkIn: checkInDetails(record),
          }))

    res.json({ tracked: true, rsvps, withRsvp, walkIns, people: attendees })
  },
)

router.post(
  '/attendance',
  requireAuth,
  requireOrganizationAdmin,
  loadEvent,
  requireTracking,
  async (req, res) => {
    const { code, userId } = req.body || {}
    const scanned = code !== undefined
    const target = scanned ? readCode(code, 'attendee')?.userId : userId
    if (scanned && !req.event.attendance.attendeeQr) {
      return res
        .status(403)
        .json({ error: 'Attendee QR check-in is unavailable.' })
    }
    if (
      typeof target !== 'string' ||
      !isValidObjectId(target) ||
      !(await User.exists({ _id: target }))
    ) {
      return res.status(400).json({
        error: scanned
          ? 'This attendee QR code is invalid or expired.'
          : 'Attendee not found.',
      })
    }
    if (!(await canAttend(req, target))) {
      return res
        .status(403)
        .json({ error: 'This attendee must join the club first.' })
    }
    return recordCheckIn(
      req,
      res,
      target,
      scanned ? 'attendee-qr' : 'staff-manual',
    )
  },
)

router.delete(
  '/attendance/:userId',
  requireAuth,
  requireOrganizationAdmin,
  loadEvent,
  async (req, res) => {
    const { userId } = req.params
    if (!isValidObjectId(userId))
      return res.status(404).json({ error: 'Attendee not found.' })
    await Attendance.updateOne(
      { ...req.eventScope, userId, reversedAt: null },
      { $set: { reversedAt: new Date(), reversedBy: req.user._id } },
    )
    res.sendStatus(204)
  },
)

module.exports = router
