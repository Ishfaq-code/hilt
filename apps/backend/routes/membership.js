const express = require('express')
const mongoose = require('mongoose')

const Organization = require('../models/Organization')
const { requireSession } = require('../middleware/session')
const { validateClubId } = require('../middleware/validation')
const { clubView } = require('../serializers/clubs')

const router = express.Router()

router.param('clubId', validateClubId)

function includesUser(ids, id) {
  return ids.some((entry) => entry.toString() === id.toString())
}

function validateMemberId(req, res, next) {
  if (!/^[a-f0-9]{24}$/i.test(req.params.userId)) {
    return res.status(400).json({ error: 'Invalid member ID.' })
  }

  next()
}

router.get('/me/clubs', requireSession, async (req, res) => {
  const clubs = await Organization.find({
    approvalStatus: 'approved',
    members: req.auth.user._id,
  })
    .populate('university')
    .sort({ name: 1 })

  res.json({
    isSiteAdmin: !!req.auth.user.isSiteAdmin,
    clubs: clubs.map((club) => ({
      ...clubView(club),
      canManage: includesUser(club.administrators, req.auth.user._id),
    })),
  })
})

router.put('/clubs/:clubId/membership', requireSession, async (req, res) => {
  const club = await Organization.findOne({
    _id: req.params.clubId,
    approvalStatus: 'approved',
  }).populate('university')

  if (!club) {
    return res.status(404).json({ error: 'Club not found.' })
  }

  if (!club.university?.emailDomains.includes(req.auth.user.emailAddress.split('@')[1])) {
    return res.status(403).json({
      error: 'Use an account with an email address from this university to join.',
    })
  }

  await Organization.updateOne(
    { _id: club._id, approvalStatus: 'approved' },
    { $addToSet: { members: req.auth.user._id } },
  )

  res.json({ membership: { active: true } })
})

router.delete('/clubs/:clubId/membership', requireSession, async (req, res) => {
  const id = req.auth.user._id

  // Count remaining administrators in the same atomic write as the departure.
  const club = await Organization.findOneAndUpdate(
    {
      _id: req.params.clubId,
      approvalStatus: 'approved',
      $or: [
        { administrators: { $ne: id } },
        {
          $expr: {
            $gt: [{ $size: { $setDifference: ['$administrators', [id]] } }, 0],
          },
        },
      ],
    },
    {
      $pull: { members: id, administrators: id },
      $inc: { revision: 1 },
    },
    { returnDocument: 'after' },
  )

  if (!club) {
    const exists = await Organization.exists({
      _id: req.params.clubId,
      approvalStatus: 'approved',
    })

    return res.status(exists ? 409 : 404).json({
      error: exists
        ? 'Add another club administrator before leaving.'
        : 'Club not found.',
    })
  }

  res.status(204).end()
})

router.get('/clubs/:clubId/members', requireSession, async (req, res) => {
  const club = await Organization.findOne({
    _id: req.params.clubId,
    approvalStatus: 'approved',
    administrators: req.auth.user._id,
  }).populate({ path: 'members', select: 'firstName lastName' })

  if (!club) {
    return res.status(404).json({
      error: 'Club not found or management access unavailable.',
    })
  }

  res.json({
    members: club.members.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdministrator: includesUser(club.administrators, user._id),
    })),
  })
})

router.put(
  '/clubs/:clubId/administrators/:userId',
  requireSession,
  validateMemberId,
  async (req, res) => {
    const club = await Organization.findOneAndUpdate(
      {
        _id: req.params.clubId,
        approvalStatus: 'approved',
        administrators: req.auth.user._id,
        members: req.params.userId,
      },
      {
        $addToSet: { administrators: req.params.userId },
        $inc: { revision: 1 },
      },
      { returnDocument: 'after' },
    )

    if (!club) {
      return res.status(404).json({
        error: 'Club or member not found, or management access unavailable.',
      })
    }

    res.status(204).end()
  },
)

router.delete(
  '/clubs/:clubId/administrators/:userId',
  requireSession,
  validateMemberId,
  async (req, res) => {
    const target = new mongoose.Types.ObjectId(req.params.userId)
    const club = await Organization.findOneAndUpdate(
      {
        _id: req.params.clubId,
        approvalStatus: 'approved',
        administrators: req.auth.user._id,
        $expr: {
          $gt: [{ $size: { $setDifference: ['$administrators', [target]] } }, 0],
        },
      },
      {
        $pull: { administrators: target },
        $inc: { revision: 1 },
      },
      { returnDocument: 'after' },
    )

    if (!club) {
      const manageable = await Organization.exists({
        _id: req.params.clubId,
        approvalStatus: 'approved',
        administrators: req.auth.user._id,
      })

      return res.status(manageable ? 409 : 404).json({
        error: manageable
          ? 'At least one club administrator must remain.'
          : 'Club not found or management access unavailable.',
      })
    }

    res.status(204).end()
  },
)

module.exports = router
