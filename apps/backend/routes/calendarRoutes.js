const express = require('express')
const Membership = require('../models/Membership')
const Rsvp = require('../models/EventRsvp')
const Organization = require('../models/Organization')
const optionalAuth = require('../middleware/optionalAuth')

const router = express.Router()
const maxRange = 32 * 24 * 60 * 60 * 1000

function readDate(value) {
  return typeof value === 'string' ? Date.parse(value) : NaN
}

router.get('/', optionalAuth, async (req, res) => {
  const { scope = 'discover' } = req.query
  const start = readDate(req.query.start)
  const end = readDate(req.query.end)
  if (
    !['discover', 'mine'].includes(scope) ||
    !(end > start) ||
    end - start > maxRange
  ) {
    return res.status(400).json({ error: 'Choose a valid calendar range.' })
  }
  if (scope === 'mine' && !req.user) {
    return res.status(401).json({ error: 'Authentication is required.' })
  }

  const userId = req.user?._id
  const [memberships, rsvps] = userId
    ? await Promise.all([
        Membership.find({ userId }, 'organizationId').lean(),
        Rsvp.find({ userId }, 'organizationId eventId').lean(),
      ])
    : [[], []]
  const joined = new Set(
    memberships.map(({ organizationId }) => String(organizationId)),
  )
  const saved = new Set(
    rsvps.map(({ organizationId, eventId }) => organizationId + ':' + eventId),
  )

  const dates = { $gte: new Date(start), $lt: new Date(end) }
  const window = { startDatetime: dates }
  if (scope === 'discover') window.endDatetime = { $gt: new Date() }

  const clubs = { events: { $elemMatch: window } }
  if (scope === 'mine') {
    clubs._id = {
      $in: [...memberships, ...rsvps].map(
        ({ organizationId }) => organizationId,
      ),
    }
  }

  const events = await Organization.aggregate([
    { $match: clubs },
    {
      $project: {
        name: 1,
        category: 1,
        events: {
          $filter: {
            input: '$events',
            as: 'event',
            cond: {
              $and: [
                { $gte: ['$$event.startDatetime', dates.$gte] },
                { $lt: ['$$event.startDatetime', dates.$lt] },
              ],
            },
          },
        },
      },
    },
  ])

  const entries = []
  for (const { _id, name, category, events: clubEvents } of events) {
    const member = joined.has(String(_id))
    for (const event of clubEvents) {
      if (event.private && !member) continue
      if (window.endDatetime && event.endDatetime <= window.endDatetime.$gt)
        continue

      const rsvped = saved.has(_id + ':' + event._id)
      if (scope === 'mine' && !member && !rsvped) continue

      entries.push({
        club: { _id, name, category },
        event,
        kind: rsvped ? 'rsvp' : member ? 'joined' : 'other',
      })
    }
  }
  entries.sort((a, b) => a.event.startDatetime - b.event.startDatetime)
  res.set('Cache-Control', 'private, no-store').json(entries)
})

module.exports = router
