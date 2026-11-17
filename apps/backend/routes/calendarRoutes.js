const express = require('express')
const Membership = require('../models/Membership')
const Rsvp = require('../models/EventRsvp')
const Organization = require('../models/Organization')
const optionalAuth = require('../middleware/optionalAuth')
const { tagsFor, withEventTags } = require('../services/tags')

const router = express.Router()
const maxRange = 32 * 24 * 60 * 60 * 1000
const defaultDiscoverPageSize = 5
const allEventsPageSize = 10

function readDate(value) {
  return typeof value === 'string' ? Date.parse(value) : NaN
}

router.get('/', optionalAuth, async (req, res) => {
  const { scope = 'discover' } = req.query
  const discover = scope === 'discover'
  const page = Number(req.query.page ?? 1)
  const pageSize = Number(req.query.limit ?? defaultDiscoverPageSize)
  const sort = req.query.sort ?? 'popular'
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
  if (discover && !['popular', 'soonest'].includes(sort)) {
    return res.status(400).json({ error: 'Choose a valid event sort order.' })
  }
  if (
    discover &&
    (!Number.isSafeInteger(pageSize) ||
      ![defaultDiscoverPageSize, allEventsPageSize].includes(pageSize))
  ) {
    return res.status(400).json({ error: 'Choose a valid event page size.' })
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

  const dateFrom =
    discover && typeof req.query.dateFrom === 'string'
      ? Math.max(Date.parse(req.query.dateFrom + 'T00:00:00'), start)
      : start
  const dateTo =
    discover && typeof req.query.dateTo === 'string'
      ? Date.parse(req.query.dateTo + 'T00:00:00') + 24 * 60 * 60 * 1000
      : end
  if (
    discover &&
    ((!Number.isFinite(dateFrom) && dateFrom !== -Infinity) ||
      (!Number.isFinite(dateTo) && dateTo !== Infinity) ||
      dateTo <= dateFrom)
  ) {
    return res.status(400).json({ error: 'Choose a valid event date range.' })
  }
  const dates = {
    $gte: new Date(dateFrom),
    ...(Number.isFinite(dateTo) ? { $lt: new Date(dateTo) } : {}),
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
        assets: 1,
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
      assets: (organization.assets ?? []).filter(({ type }) =>
        /logo|icon/i.test(type),
      ),
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
    const eventCategoryFilters = []
      .concat(req.query.eventCategory ?? [])
      .filter(Boolean)
    const selectedClub =
      typeof req.query.club === 'string' ? req.query.club : ''
    const search =
      typeof req.query.search === 'string'
        ? req.query.search.trim().toLowerCase()
        : ''
    const filtered = entries.filter(({ club, event }) => {
      const searchable = [
        event.name,
        event.place,
        event.description,
        club.name,
        ...club.tags,
        ...event.tags,
      ]
        .join(' ')
        .toLowerCase()
      const clubTags = tagsFor(club.tags)
      return (
        (!selectedClub || String(club._id) === selectedClub) &&
        (!search ||
          search.split(/\s+/).every((term) => searchable.includes(term))) &&
        (!eventCategoryFilters.length ||
          event.tags.some((tag) =>
            eventCategoryFilters.some(
              (filter) => tag.toLowerCase() === filter.toLowerCase(),
            ),
          )) &&
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
    const rsvpCounts = await Rsvp.aggregate([
      {
        $group: {
          _id: { organizationId: '$organizationId', eventId: '$eventId' },
          count: { $sum: 1 },
        },
      },
    ])
    const countsByEvent = new Map(
      rsvpCounts.map(({ _id, count }) => [
        String(_id.organizationId) + ':' + String(_id.eventId),
        count,
      ]),
    )
    filtered.sort((a, b) => {
      const aCount =
        countsByEvent.get(String(a.club._id) + ':' + a.event._id) || 0
      const bCount =
        countsByEvent.get(String(b.club._id) + ':' + b.event._id) || 0
      const chronological =
        a.event.startDatetime - b.event.startDatetime ||
        String(a.event._id).localeCompare(String(b.event._id))
      if (sort === 'soonest') return chronological
      return bCount - aCount || chronological
    })
    const offset = (page - 1) * pageSize
    res.set('Cache-Control', 'private, no-store').json({
      entries: filtered.slice(offset, offset + pageSize).map((entry) => ({
        ...entry,
        rsvpCount:
          countsByEvent.get(String(entry.club._id) + ':' + entry.event._id) ||
          0,
      })),
      page,
      hasNext: filtered.length > offset + pageSize,
      total: filtered.length,
      eventTags,
    })
    return
  }
  res.set('Cache-Control', 'private, no-store').json(entries)
})

module.exports = router
