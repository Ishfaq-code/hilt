const express = require('express')
const Membership = require('../models/Membership')
const Rsvp = require('../models/EventRsvp')
const Organization = require('../models/Organization')
const optionalAuth = require('../middleware/optionalAuth')
const { tagsFor, withEventTags } = require('../services/tags')

const router = express.Router()
const maxRange = 32 * 24 * 60 * 60 * 1000
const pageSize = 10

function readDate(value) {
  return typeof value === 'string' ? Date.parse(value) : NaN
}

router.get('/', optionalAuth, async (req, res) => {
  const { scope = 'discover' } = req.query
  const discover = scope === 'discover'
  const page = Number(req.query.page ?? 1)
  const start =
    discover && !req.query.start ? Date.now() : readDate(req.query.start)
  const end = discover && !req.query.end ? Infinity : readDate(req.query.end)
  if (!['discover', 'mine'].includes(scope)) {
    return res.status(400).json({ error: 'Choose a valid calendar range.' })
  }
  if (!discover && (!(end > start) || end - start > maxRange)) {
    return res.status(400).json({ error: 'Choose a valid calendar range.' })
  }
  if (
    discover &&
    (Boolean(req.query.start) !== Boolean(req.query.end) ||
      (req.query.start && (!(end > start) || end - start > maxRange)))
  ) {
    return res.status(400).json({ error: 'Choose a valid calendar range.' })
  }
  if (discover && (!Number.isSafeInteger(page) || page < 1)) {
    return res.status(400).json({ error: 'Choose a valid event page.' })
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

  const dates = {
    $gte: new Date(start),
    ...(Number.isFinite(end) ? { $lt: new Date(end) } : {}),
  }
  const window = { startDatetime: dates }
  if (discover) {
    window.endDatetime = { $gt: new Date() }
    window.status = 'published'
    window.private = { $ne: true }
  }

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
        tags: 1,
        category: 1,
        events: {
          $filter: {
            input: '$events',
            as: 'event',
            cond: {
              $and: [
                { $gte: ['$$event.startDatetime', dates.$gte] },
                ...(dates.$lt
                  ? [{ $lt: ['$$event.startDatetime', dates.$lt] }]
                  : []),
                ...(discover
                  ? [
                      { $eq: ['$$event.status', 'published'] },
                      { $ne: ['$$event.private', true] },
                      { $gt: ['$$event.endDatetime', new Date()] },
                    ]
                  : []),
              ],
            },
          },
        },
      },
    },
  ])

  const entries = []
  for (const organization of events) {
    const { _id, name, events: clubEvents } = organization
    const club = {
      _id,
      name,
      tags: tagsFor(organization.tags, organization.category),
    }
    const member = joined.has(String(_id))
    for (const event of clubEvents) {
      if (
        event.status === 'draft' ||
        (discover && event.private) ||
        (event.private && !member)
      )
        continue
      if (window.endDatetime && event.endDatetime <= window.endDatetime.$gt)
        continue

      const rsvped = saved.has(_id + ':' + event._id)
      if (scope === 'mine' && !member && !rsvped) continue

      entries.push({
        club,
        event: withEventTags(event),
        kind: rsvped ? 'rsvp' : member ? 'joined' : 'other',
      })
    }
  }
  entries.sort((a, b) => a.event.startDatetime - b.event.startDatetime)
  if (discover && !req.query.start && !req.query.end) {
    const clubTagFilters = [].concat(req.query.clubTag ?? []).filter(Boolean)
    const eventTagFilters = [].concat(req.query.eventTag ?? []).filter(Boolean)
    const selectedClub =
      typeof req.query.club === 'string' ? req.query.club : ''
    const search =
      typeof req.query.search === 'string'
        ? req.query.search.trim().toLowerCase()
        : ''
    const filtered = entries.filter(({ club, event }) => {
      const searchable = [event.name, event.place, club.name]
        .join(' ')
        .toLowerCase()
      const clubTags = tagsFor(club.tags)
      return (
        (!selectedClub || String(club._id) === selectedClub) &&
        (!search || searchable.includes(search)) &&
        (!clubTagFilters.length ||
          clubTags.some((tag) =>
            clubTagFilters.some(
              (filter) => tag.toLowerCase() === filter.toLowerCase(),
            ),
          )) &&
        (!eventTagFilters.length ||
          event.tags.some((tag) =>
            eventTagFilters.some(
              (filter) => tag.toLowerCase() === filter.toLowerCase(),
            ),
          ))
      )
    })
    const eventTags = [...new Set(entries.flatMap(({ event }) => event.tags))]
    const offset = (page - 1) * pageSize
    res.set('Cache-Control', 'private, no-store').json({
      entries: filtered.slice(offset, offset + pageSize),
      page,
      hasNext: filtered.length > offset + pageSize,
      eventTags,
    })
    return
  }
  res.set('Cache-Control', 'private, no-store').json(entries)
})

module.exports = router
