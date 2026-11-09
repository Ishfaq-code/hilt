const express = require('express')

const Organization = require('../models/Organization')
const User = require('../models/User')
const { requireSession } = require('../middleware/session')
const {
  expectJson,
  validateClubId,
  allowedFields,
  validRevision,
} = require('../middleware/validation')
const { applicationView } = require('../serializers/clubs')

const router = express.Router()

router.param('clubId', validateClubId)

function requireSiteAdmin(req, res, next) {
  if (!req.auth.user.isSiteAdmin) {
    return res.status(403).json({
      error: 'Site administrator access is required.',
    })
  }

  next()
}

router.get('/', requireSession, requireSiteAdmin, async (req, res) => {
  const { status = 'pending', offset = '0' } = req.query

  if (
    !['pending', 'approved', 'rejected'].includes(status)
    || typeof offset !== 'string'
    || !/^\d+$/.test(offset)
    || Number(offset) > 10000
  ) {
    return res.status(400).json({
      error: 'Invalid application status or pagination.',
    })
  }

  const [applications, total] = await Promise.all([
    Organization.find({ approvalStatus: status })
      .populate('university')
      .sort({ createdAt: 1, _id: 1 })
      .skip(Number(offset))
      .limit(20),
    Organization.countDocuments({ approvalStatus: status }),
  ])

  res.json({
    applications: applications.map(applicationView),
    total,
    offset: Number(offset),
    limit: 20,
  })
})

router.post(
  '/:clubId/review',
  requireSession,
  requireSiteAdmin,
  expectJson,
  async (req, res) => {
    if (
      !allowedFields(req.body, ['decision', 'message', 'revision'])
      || !validRevision(req.body.revision)
      || !['approve', 'reject', 'request_changes'].includes(req.body.decision)
      || typeof req.body.message !== 'string'
      || req.body.message.trim().length > 2000
      || (req.body.decision !== 'approve' && !req.body.message.trim())
    ) {
      return res.status(400).json({
        error: 'Provide a decision, current revision, and a message (required for rejection or clarification, maximum 2000 characters).',
      })
    }

    const application = await Organization.findOne({
      _id: req.params.clubId,
      approvalStatus: 'pending',
      revision: req.body.revision,
    })

    if (!application) {
      return res.status(409).json({
        error: 'This application changed or was already reviewed. Refresh the queue.',
      })
    }

    if (!(await User.exists({ _id: application.owner }))) {
      return res.status(409).json({
        error: 'The applicant account is no longer available.',
      })
    }

    const status = {
      approve: 'approved',
      reject: 'rejected',
      request_changes: 'pending',
    }[req.body.decision]

    const update = {
      $set: { approvalStatus: status },
      $inc: { revision: 1 },
      $push: {
        reviews: {
          decision: req.body.decision,
          message: req.body.message.trim(),
          actor: req.auth.user._id,
          at: new Date(),
          revision: req.body.revision + 1,
        },
      },
    }

    if (status === 'approved') {
      update.$addToSet = {
        members: application.owner,
        administrators: application.owner,
      }
    }

    const club = await Organization.findOneAndUpdate(
      {
        _id: application._id,
        approvalStatus: 'pending',
        revision: req.body.revision,
      },
      update,
      { returnDocument: 'after', runValidators: true },
    ).populate('university')

    if (!club) {
      return res.status(409).json({
        error: 'Another reviewer or applicant changed this application. Refresh the queue.',
      })
    }

    res.json({ application: applicationView(club) })
  },
)

module.exports = router
