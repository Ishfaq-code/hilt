const express = require('express')
const { pipeline } = require('node:stream/promises')
const { isObjectIdOrHexString } = require('mongoose')
const Application = require('../models/Application')
const Membership = require('../models/Membership')
const Organization = require('../models/Organization')
const optionalAuth = require('../middleware/optionalAuth')
const { clubPermissions } = require('../services/clubAccess')
const { mediaLink } = require('../services/media')
const { getFile } = require('../services/s3Service')

const router = express.Router()

function notFound(res) {
  return res.status(404).json({ error: 'File not found.' })
}

async function sendFile(res, key) {
  const file = await getFile(key)
  if (!file) return notFound(res)

  res.set({
    'Content-Type': file.ContentType,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store',
  })
  if (file.ContentLength != null)
    res.set('Content-Length', String(file.ContentLength))
  if (file.ContentType === 'application/pdf')
    res.set('Content-Disposition', 'attachment')
  await pipeline(file.Body, res)
}

async function applicationFor(id, user) {
  if (!user) return null
  return Application.findOne(
    {
      _id: id,
      ...(user.appRole === 'admin' ? {} : { userId: user._id }),
    },
    'assets additionalDocuments',
  ).lean()
}

router.get('/clubs/:id/:filename', optionalAuth, async (req, res) => {
  const { id, filename } = req.params
  if (!isObjectIdOrHexString(id)) return notFound(res)

  const key = `clubs/${id}/${filename}`
  const club = await Organization.findById(id, 'assets').lean()
  if (club?.assets?.some((asset) => asset.link === mediaLink(key))) {
    return sendFile(res, key)
  }
  const application = await applicationFor(id, req.user)
  if (!application?.assets?.some((asset) => asset.link === mediaLink(key)))
    return notFound(res)
  return sendFile(res, key)
})

router.get(
  '/clubs/:id/events/:eventId/:filename',
  optionalAuth,
  async (req, res) => {
    const { id, eventId, filename } = req.params
    if (!isObjectIdOrHexString(id) || !isObjectIdOrHexString(eventId))
      return notFound(res)

    const key = `clubs/${id}/events/${eventId}/${filename}`
    const club = await Organization.findOne(
      { _id: id, 'events._id': eventId },
      { 'events.$': 1 },
    ).lean()
    const event = club?.events[0]
    if (event?.banner !== mediaLink(key)) return notFound(res)
    if (event.status === 'draft') {
      if (
        !req.user ||
        !(await clubPermissions(id, req.user)).includes('events')
      )
        return notFound(res)
    } else if (event.private && req.user?.appRole !== 'admin') {
      if (
        !req.user ||
        !(await Membership.exists({ organizationId: id, userId: req.user._id }))
      )
        return notFound(res)
    }
    return sendFile(res, key)
  },
)

router.get('/applications/:id/:filename', optionalAuth, async (req, res) => {
  const { id, filename } = req.params
  if (!isObjectIdOrHexString(id)) return notFound(res)

  const key = `applications/${id}/${filename}`
  const application = await applicationFor(id, req.user)
  if (
    !application?.additionalDocuments?.some(
      (document) => document.link === mediaLink(key),
    )
  )
    return notFound(res)
  return sendFile(res, key)
})

module.exports = router
