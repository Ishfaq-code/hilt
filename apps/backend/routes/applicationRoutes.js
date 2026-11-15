const express = require('express')
const mongoose = require('mongoose')
const Application = require('../models/Application')
const Organization = require('../models/Organization')
const { createClub } = require('../services/clubAccess')
const { parseApplicationRoles } = require('../services/clubRoles')
const { parseTags, tagsFor } = require('../services/clubTags')
const s3Service = require('../services/s3Service')
const requireAppAdmin = require('../middleware/requireAppAdmin')
const requireAuth = require('../middleware/requireAuth')
const multer = require('multer')

const router = express.Router()
const applicationFields = new Set([
  'organizationName',
  'organizationDescription',
  'tags',
  'contactEmail',
  'link',
  'roleSetup',
])
const uploadDocument = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (file.mimetype !== 'application/pdf')
      return callback(new Error('Only PDF documents are supported.'))
    return callback(null, true)
  },
}).single('document')

function handleDocumentUpload(req, res, next) {
  uploadDocument(req, res, (error) => {
    if (!error) return next()
    const statusCode =
      error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
        ? 413
        : 400
    return res
      .status(statusCode)
      .json({ error: error.message || 'The document could not be uploaded.' })
  })
}

router.get('/', requireAuth, requireAppAdmin, async (req, res, next) => {
  try {
    const applications = await Application.find({}).populate(
      'userId',
      'firstName lastName email',
    )
    return res.status(200).json(applications)
  } catch (error) {
    return next(error)
  }
})

router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const applications = await Application.find({ userId: req.user._id }).sort({
      createdAt: -1,
    })
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
    return res
      .status(403)
      .json({ error: 'You can only access your own applications.' })
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
    const query = Application.findById(req.params.applicationId)
    if (req.user.appRole === 'admin')
      query.populate('userId', 'firstName lastName email')
    const application = await query
    if (!application)
      return res.status(404).json({ error: 'Application not found.' })
    if (
      req.user.appRole !== 'admin' &&
      !application.userId.equals(req.user._id)
    ) {
      return res
        .status(403)
        .json({ error: 'You can only access your own applications.' })
    }
    return res.status(200).json(application)
  } catch (error) {
    return next(error)
  }
})

router.post('/', requireAuth, handleDocumentUpload, async (req, res, next) => {
  const body = req.body
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Application details are required.' })
  }
  const fields = Object.keys(body)
  if (
    !fields.includes('organizationName') ||
    fields.some((field) => !applicationFields.has(field))
  ) {
    return res.status(400).json({
      error: 'One or more application fields are missing or cannot be set.',
    })
  }
  if (
    typeof body.organizationName !== 'string' ||
    !body.organizationName.trim()
  ) {
    return res.status(400).json({ error: 'Organization name is required.' })
  }
  if (
    body.contactEmail &&
    (typeof body.contactEmail !== 'string' ||
      !/^\S+@\S+\.\S+$/.test(body.contactEmail))
  ) {
    return res
      .status(400)
      .json({ error: 'Contact email must be a valid email address.' })
  }
  if (
    body.link &&
    (typeof body.link !== 'string' || !/^https?:\/\//i.test(body.link))
  ) {
    return res
      .status(400)
      .json({ error: 'Supporting link must start with http:// or https://.' })
  }

  let roleSetup = body.roleSetup
  if (typeof roleSetup === 'string' && req.is('multipart/form-data')) {
    try {
      roleSetup = JSON.parse(roleSetup)
    } catch {
      return res.status(400).json({ error: 'Provide valid club roles.' })
    }
  }
  roleSetup = parseApplicationRoles(roleSetup)

  let tags = Object.hasOwn(body, 'tags') ? body.tags : []
  if (typeof tags === 'string' && req.is('multipart/form-data')) tags = [tags]
  tags = parseTags(tags)
  if (!tags)
    return res.status(400).json({ error: 'Tags must be a list of names.' })

  let uploadedDocument
  try {
    if (req.file) {
      uploadedDocument = await s3Service.uploadFile({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        contentType: req.file.mimetype,
        prefix: `applications/${req.user.id}`,
      })
    }
    const application = await Application.create({
      ...body,
      roleSetup,
      tags,
      userId: req.user._id,
      additionalDocuments: uploadedDocument
        ? [{ name: req.file.originalname, link: uploadedDocument.url }]
        : [],
      status: 'pending',
    })
    return res.status(201).json(application)
  } catch (error) {
    if (uploadedDocument?.key) {
      try {
        await s3Service.deleteFile(uploadedDocument.key)
      } catch (cleanupError) {
        console.error(
          'Failed to clean up an unlinked application document:',
          cleanupError.name,
        )
      }
    }
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ error: 'Application details are invalid.' })
    }
    if (error.message?.startsWith('S3 is not configured'))
      return res
        .status(503)
        .json({ error: 'Document uploads are not currently available.' })
    return next(error)
  }
})

router.patch(
  '/:applicationId',
  requireAuth,
  requireAppAdmin,
  async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.applicationId)) {
      return res.status(404).json({ error: 'Application not found.' })
    }
    const updates = req.body
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return res
        .status(400)
        .json({ error: 'A valid application update is required.' })
    }
    const fields = Object.keys(updates)
    if (!fields.length)
      return res
        .status(400)
        .json({ error: 'At least one application field must be provided.' })
    if (
      fields.some(
        (field) => !applicationFields.has(field) && field !== 'status',
      )
    ) {
      return res
        .status(400)
        .json({ error: 'One or more application fields cannot be updated.' })
    }
    if (Object.hasOwn(updates, 'roleSetup'))
      updates.roleSetup = parseApplicationRoles(updates.roleSetup)
    if (Object.hasOwn(updates, 'tags')) {
      updates.tags = parseTags(updates.tags)
      if (!updates.tags)
        return res.status(400).json({ error: 'Tags must be a list of names.' })
    }
    if (
      Object.hasOwn(updates, 'status') &&
      !['approved', 'denied'].includes(updates.status)
    ) {
      return res
        .status(400)
        .json({ error: 'Application status must be approved or denied.' })
    }

    try {
      const application = await Application.findById(req.params.applicationId)
      if (!application)
        return res.status(404).json({ error: 'Application not found.' })
      if (
        Object.hasOwn(updates, 'status') &&
        application.status !== 'pending'
      ) {
        return res
          .status(409)
          .json({ error: 'This application has already been reviewed.' })
      }
      if (updates.status === 'approved') {
        const roleSetup =
          updates.roleSetup ??
          parseApplicationRoles(
            application.roleSetup?.map((role) => role.toObject()),
          )
        const claimed = await Application.findOneAndUpdate(
          { _id: application._id, status: 'pending' },
          {
            $set: {
              ...updates,
              roleSetup,
              status: 'approved',
              reviewedBy: req.user._id,
              reviewedAt: new Date(),
            },
          },
          { returnDocument: 'after' },
        )
        if (!claimed)
          return res
            .status(409)
            .json({ error: 'This application has already been reviewed.' })
        try {
          const organization = new Organization({
            name: claimed.organizationName,
            description: claimed.organizationDescription,
            tags: tagsFor(claimed),
            profile: claimed.link,
          })
          await createClub(organization, claimed.userId, roleSetup)
        } catch (error) {
          await Application.updateOne(
            { _id: claimed._id, status: 'approved', reviewedBy: req.user._id },
            { $set: { status: 'pending', reviewedBy: null, reviewedAt: null } },
          )
          throw error
        }
        return res.status(200).json(claimed)
      }
      if (updates.status === 'denied') {
        const denied = await Application.findOneAndUpdate(
          { _id: application._id, status: 'pending' },
          {
            $set: {
              status: 'denied',
              reviewedBy: req.user._id,
              reviewedAt: new Date(),
            },
          },
          { returnDocument: 'after' },
        )
        if (!denied)
          return res
            .status(409)
            .json({ error: 'This application has already been reviewed.' })
        return res.status(200).json(denied)
      }
      for (const field of fields) {
        if (field === 'status') {
          application.status = updates.status
          application.reviewedBy = req.user._id
          application.reviewedAt = new Date()
        } else {
          application.set(field, updates[field])
        }
      }
      await application.save()
      return res.status(200).json(application)
    } catch (error) {
      if (error.name === 'ValidationError' || error.name === 'CastError') {
        return res
          .status(400)
          .json({ error: 'Application details are invalid.' })
      }
      return next(error)
    }
  },
)

router.delete(
  '/:applicationId',
  requireAuth,
  requireAppAdmin,
  async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.applicationId)) {
      return res.status(404).json({ error: 'Application not found.' })
    }

    try {
      const application = await Application.findByIdAndDelete(
        req.params.applicationId,
      )
      if (!application)
        return res.status(404).json({ error: 'Application not found.' })
      return res.status(204).end()
    } catch (error) {
      return next(error)
    }
  },
)

module.exports = router
