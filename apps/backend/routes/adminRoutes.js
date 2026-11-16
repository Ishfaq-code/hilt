const express = require('express')
const ClubReport = require('../models/ClubReport')
const EventReport = require('../models/EventReport')
const EventAttendance = require('../models/EventAttendance')
const EventRsvp = require('../models/EventRsvp')
const { getAdminStatistics } = require('../services/adminStatistics')
const { withClubTags, withEventTags } = require('../services/tags')
const Membership = require('../models/Membership')
const Organization = require('../models/Organization')
const requireAuth = require('../middleware/requireAuth')
const requireAppAdmin = require('../middleware/requireAppAdmin')

const router = express.Router()

router.use(requireAuth, requireAppAdmin)

router.get('/event-reports', async (req, res) => {
  const reports = await EventReport.find({}, 'clubName eventName reason createdAt')
    .sort({ createdAt: -1 })
    .lean()
  res.json(reports)
})

router.get('/reports', async (req, res) => {
  const [clubs, events] = await Promise.all([
    ClubReport.find({}, 'clubName reason createdAt').lean(),
    EventReport.find({}, 'clubName eventName reason createdAt').lean(),
  ])
  res.json([...clubs, ...events].sort((a, b) => b.createdAt - a.createdAt))
})

router.get('/statistics', async (req, res, next) => {
  try {
    return res.status(200).json(await getAdminStatistics())
  } catch (error) {
    return next(error)
  }
})

router.get('/organizations', async (req, res, next) => {
  try {
    const organizations = await Organization.find(
      {},
      'name description tags category profile assets membershipFee events createdAt',
    )
      .sort({ name: 1 })
      .lean()
    const [membershipCounts, attendanceCounts, rsvpCounts] = await Promise.all([
      Membership.aggregate([
        {
          $group: {
            _id: '$organizationId',
            members: { $sum: 1 },
            paidMembers: { $sum: { $cond: ['$isPaid', 1, 0] } },
          },
        },
      ]),
      EventAttendance.aggregate([
        { $match: { reversedAt: null } },
        {
          $group: {
            _id: { organizationId: '$organizationId', eventId: '$eventId' },
            attendees: { $sum: 1 },
          },
        },
      ]),
      EventRsvp.aggregate([
        {
          $group: {
            _id: { organizationId: '$organizationId', eventId: '$eventId' },
            rsvps: { $sum: 1 },
          },
        },
      ]),
    ])
    const countsByOrganization = new Map(
      membershipCounts.map((item) => [String(item._id), item]),
    )
    const attendanceByEvent = new Map(
      attendanceCounts.map((item) => [
        `${item._id.organizationId}:${item._id.eventId}`,
        item.attendees,
      ]),
    )
    const rsvpsByEvent = new Map(
      rsvpCounts.map((item) => [
        `${item._id.organizationId}:${item._id.eventId}`,
        item.rsvps,
      ]),
    )
    return res.status(200).json(
      organizations.map((organization) => {
        const membership = countsByOrganization.get(String(organization._id))
        const fee = organization.membershipFee || 0
        const events = (organization.events ?? [])
          .filter((event) => event.status !== 'draft')
          .map((event) => ({
            ...withEventTags(event),
            attendanceCount:
              attendanceByEvent.get(`${organization._id}:${event._id}`) || 0,
            rsvpCount:
              rsvpsByEvent.get(`${organization._id}:${event._id}`) || 0,
          }))
        return {
          ...withClubTags(organization),
          events,
          memberCount: membership?.members || 0,
          collectedDues: (membership?.paidMembers || 0) * fee,
          publishedEventCount: events.length,
        }
      }),
    )
  } catch (error) { return next(error) }
})

module.exports = router
