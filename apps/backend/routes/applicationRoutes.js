const express = require('express')
const mongoose = require('mongoose')
const Application = require('../models/Application')
const Organization = require('../models/Organization')
const { createClub } = require('../services/clubAccess')
const { parseApplicationRoles } = require('../services/clubRoles')
const { parseTags, tagsFor } = require('../services/tags')
const {
  saveClubImages,
  saveWithUploads,
  deleteMedia,
  deleteUnusedClubImages,
} = require('../services/media')
const requireAppAdmin = require('../middleware/requireAppAdmin')
const requireAuth = require('../middleware/requireAuth')
const { uploads, uploadError } = require('../middleware/uploads')

const router = express.Router()
const applicationFields = new Set([
  'organizationName',
  'organizationDescription',
  'tags',
  'contactEmail',
  'link',
  'roleSetup',
])
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

router.post(
  '/',
  requireAuth,
  uploads('icon', 'banner', 'document'),
  async (req, res, next) => {
    const body = req.body
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res
        .status(400)
        .json({ error: 'Application details are required.' })
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

    const { icon, banner, document } = req.uploads
    if (!icon || !banner)
      return res.status(400).json({ error: 'Upload a club icon and banner.' })

    try {
      const application = new Application({
        ...body,
        roleSetup,
        tags,
        userId: req.user._id,
      })
      await application.validate()

      await saveClubImages(application.id, { icon, banner }, [], (assets) =>
        saveWithUploads(
          `applications/${application.id}`,
          document ? { document } : {},
          async (links) => {
            application.assets = assets
            if (document)
              application.additionalDocuments = [
                { name: document.originalname, link: links.document },
              ]
            await application.save()
          },
        ),
      )
      return res.status(201).json(application)
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

async function approveApplication(application, updates, reviewer, files) {
  const previousAssets = application.assets
  for (const type of ['icon', 'banner']) {
    if (!files[type] && !previousAssets.some((asset) => asset.type === type))
      throw uploadError('Upload a club icon and banner before approving.')
  }

  const roleSetup =
    updates.roleSetup ??
    parseApplicationRoles(application.roleSetup?.map((role) => role.toObject()))

  return saveClubImages(
    application.id,
    files,
    previousAssets,
    async (assets) => {
      const claimed = await Application.findOneAndUpdate(
        { _id: application._id, status: 'pending' },
        {
          $set: {
            ...updates,
            assets,
            roleSetup,
            status: 'approved',
            reviewedBy: reviewer,
            reviewedAt: new Date(),
          },
        },
        { returnDocument: 'after' },
      )
      if (!claimed)
        throw uploadError('This application has already been reviewed.', 409)

      try {
        const organization = new Organization({
          _id: claimed._id,
          name: claimed.organizationName,
          description: claimed.organizationDescription,
          tags: tagsFor(claimed.tags, claimed.category),
          profile: claimed.link,
          assets,
        })
        await createClub(organization, claimed.userId, roleSetup)
      } catch (error) {
        await Application.updateOne(
          { _id: claimed._id, status: 'approved', reviewedBy: reviewer },
          {
            $set: {
              assets: previousAssets,
              status: 'pending',
              reviewedBy: null,
              reviewedAt: null,
            },
          },
        )
        throw error
      }
      return claimed
    },
  )
}

router.patch(
  '/:applicationId',
  requireAuth,
  requireAppAdmin,
  uploads('icon', 'banner'),
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
        const approved = await approveApplication(
          application,
          updates,
          req.user._id,
          req.uploads,
        )
        return res.status(200).json(approved)
      }
      if (Object.keys(req.uploads).length)
        throw uploadError(
          'Club images can be uploaded when approving an application.',
        )
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
      await deleteMedia(
        `applications/${application.id}`,
        application.additionalDocuments.map((document) => document.link),
      )
      await deleteUnusedClubImages(
        application.id,
        application.assets.map((asset) => asset.link),
      )
      return res.status(204).end()
    } catch (error) {
      return next(error)
    }
  },
)

module.exports = router
