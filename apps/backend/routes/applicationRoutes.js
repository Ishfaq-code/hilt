const express = require('express')
const mongoose = require('mongoose')
const Application = require('../models/Application')
const requireAppAdmin = require('../middleware/requireAppAdmin')
const requireAuth = require('../middleware/requireAuth')

const router = express.Router()
const applicationFields = new Set(['organizationName', 'organizationDescription', 'additionalDocuments'])

router.get('/', requireAuth, requireAppAdmin, async (req, res, next) => {
  try {
    const applications = await Application.find({})
    return res.status(200).json(applications)
  } catch (error) {
    return next(error)
  }
})

router.get('/user/:userId', requireAuth, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.userId)) {
    return res.status(404).json({ error: 'User not found.' })
  }
  if (req.user.appRole !== 'admin' && !req.user._id.equals(req.params.userId)) {
    return res.status(403).json({ error: 'You can only access your own applications.' })
  }

  try {
    const applications = await Application.find({ userId: req.params.userId })
    return res.status(200).json(applications)
  } catch (error) {
    return next(error)
  }
})

router.get('/:applicationId', requireAuth, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.applicationId)) {
    return res.status(404).json({ error: 'Application not found.' })
  }

  try {
    const application = await Application.findById(req.params.applicationId)
    if (!application) return res.status(404).json({ error: 'Application not found.' })
    if (req.user.appRole !== 'admin' && !application.userId.equals(req.user._id)) {
      return res.status(403).json({ error: 'You can only access your own applications.' })
    }
    return res.status(200).json(application)
  } catch (error) {
    return next(error)
  }
})

router.post('/', requireAuth, async (req, res, next) => {
  const body = req.body
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Application details are required.' })
  }
  const fields = Object.keys(body)
  if (!fields.length || fields.some((field) => !applicationFields.has(field))) {
    return res.status(400).json({ error: 'One or more application fields are missing or cannot be set.' })
  }

  try {
    const application = await Application.create({ ...body, userId: req.user._id })
    return res.status(201).json(application)
  } catch (error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ error: 'Application details are invalid.' })
    }
    return next(error)
  }
})

router.patch('/:applicationId', requireAuth, requireAppAdmin, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.applicationId)) {
    return res.status(404).json({ error: 'Application not found.' })
  }
  const updates = req.body
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    return res.status(400).json({ error: 'A valid application update is required.' })
  }
  const fields = Object.keys(updates)
  if (!fields.length) return res.status(400).json({ error: 'At least one application field must be provided.' })
  if (fields.some((field) => !applicationFields.has(field))) {
    return res.status(400).json({ error: 'One or more application fields cannot be updated.' })
  }

  try {
    const application = await Application.findById(req.params.applicationId)
    if (!application) return res.status(404).json({ error: 'Application not found.' })
    for (const field of fields) application.set(field, updates[field])
    await application.save()
    return res.status(200).json(application)
  } catch (error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ error: 'Application details are invalid.' })
    }
    return next(error)
  }
})

router.delete('/:applicationId', requireAuth, requireAppAdmin, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.applicationId)) {
    return res.status(404).json({ error: 'Application not found.' })
  }

  try {
    const application = await Application.findByIdAndDelete(req.params.applicationId)
    if (!application) return res.status(404).json({ error: 'Application not found.' })
    return res.status(204).end()
  } catch (error) {
    return next(error)
  }
})

module.exports = router
