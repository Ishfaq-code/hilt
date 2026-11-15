const { parseTags } = require('./tags')

const fields = new Set([
  'name',
  'description',
  'startDatetime',
  'endDatetime',
  'place',
  'tags',
  'private',
  'banner',
  'attendance',
  'status',
  'draftSchedule',
])
const textFields = ['name', 'description', 'place', 'banner']
const attendanceFields = new Set([
  'enabled',
  'self',
  'eventQr',
  'attendeeQr',
  'walkIns',
])
const scheduleFields = new Set(['date', 'startTime', 'endTime'])

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

function invalid(message) {
  throw Object.assign(new Error(message), { status: 400 })
}

function eventDetails(body, current) {
  if (
    !object(body) ||
    !Object.keys(body).length ||
    Object.keys(body).some((key) => !fields.has(key))
  ) {
    invalid('Provide valid event fields.')
  }
  for (const key of textFields) {
    if (
      body[key] !== undefined &&
      body[key] !== null &&
      typeof body[key] !== 'string'
    ) {
      invalid('Event details are invalid.')
    }
  }
  if (body.private !== undefined && typeof body.private !== 'boolean') {
    invalid('Choose a valid event visibility.')
  }
  if (
    body.attendance !== undefined &&
    (!object(body.attendance) ||
      Object.entries(body.attendance).some(
        ([key, value]) =>
          !attendanceFields.has(key) || typeof value !== 'boolean',
      ))
  ) {
    invalid('Choose valid attendance settings.')
  }
  if (
    body.draftSchedule != null &&
    (!object(body.draftSchedule) ||
      Object.entries(body.draftSchedule).some(
        ([key, value]) => !scheduleFields.has(key) || typeof value !== 'string',
      ))
  ) {
    invalid('Choose valid draft dates and times.')
  }

  const next = {
    ...body,
    status: body.status ?? current?.status ?? 'published',
  }
  if (Object.hasOwn(body, 'tags')) {
    next.tags = parseTags(body.tags)
    if (!next.tags) invalid('Tags must be a list of names.')
  }
  if (!['draft', 'published'].includes(next.status))
    invalid('Choose a valid event status.')
  if (current && current.status !== 'draft' && next.status === 'draft') {
    invalid('This event has already been published.')
  }
  if (next.status === 'draft') {
    return { ...next, startDatetime: null, endDatetime: null }
  }

  const start = Object.hasOwn(next, 'startDatetime')
    ? next.startDatetime
    : current?.startDatetime
  const end = Object.hasOwn(next, 'endDatetime')
    ? next.endDatetime
    : current?.endDatetime
  const startTime =
    start instanceof Date
      ? +start
      : typeof start === 'string'
        ? Date.parse(start)
        : NaN
  const endTime =
    end instanceof Date ? +end : typeof end === 'string' ? Date.parse(end) : NaN
  if (
    !(next.name ?? current?.name)?.trim() ||
    !Number.isFinite(startTime) ||
    !Number.isFinite(endTime) ||
    endTime <= startTime
  ) {
    invalid('Enter a title and an end time after the start time.')
  }
  if (
    (!current || current.status === 'draft') &&
    (!(next.description ?? current?.description)?.trim() ||
      !(next.place ?? current?.place)?.trim())
  ) {
    invalid('Enter a description and location to publish.')
  }
  return {
    ...next,
    startDatetime: start,
    endDatetime: end,
    draftSchedule: undefined,
  }
}

module.exports = eventDetails
