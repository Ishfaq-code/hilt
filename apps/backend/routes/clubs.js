const express = require('express')

const Organization = require('../models/Organization')
const University = require('../models/University')
const { validateClubId } = require('../middleware/validation')
const { universityView, clubView } = require('../serializers/clubs')

const router = express.Router()

router.param('clubId', validateClubId)

router.get('/universities', async (req, res) => {
  const universities = await University.find().sort({ name: 1 })

  res.json({ universities: universities.map(universityView) })
})

router.get('/clubs', async (req, res) => {
  const { q = '', universityId, limit = '20', offset = '0' } = req.query

  if (
    typeof q !== 'string'
    || q.length > 100
    || typeof limit !== 'string'
    || !/^\d+$/.test(limit)
    || typeof offset !== 'string'
    || !/^\d+$/.test(offset)
    || Number(limit) < 1
    || Number(limit) > 50
    || Number(offset) > 10000
    || (universityId !== undefined && (
      typeof universityId !== 'string'
      || !/^[a-f0-9]{24}$/i.test(universityId)
    ))
  ) {
    return res.status(400).json({ error: 'Invalid search or pagination.' })
  }

  const filter = { approvalStatus: 'approved' }

  if (universityId) {
    filter.university = universityId
  }

  if (q.trim()) {
    filter.name = {
      $regex: q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      $options: 'i',
    }
  }

  const [clubs, total] = await Promise.all([
    Organization.find(filter)
      .populate('university')
      .sort({ name: 1, _id: 1 })
      .skip(Number(offset))
      .limit(Number(limit)),
    Organization.countDocuments(filter),
  ])

  res.json({
    clubs: clubs.map(clubView),
    total,
    limit: Number(limit),
    offset: Number(offset),
  })
})

router.get('/clubs/:clubId', async (req, res) => {
  const club = await Organization.findOne({
    _id: req.params.clubId,
    approvalStatus: 'approved',
  }).populate('university')

  if (!club) {
    return res.status(404).json({ error: 'Club not found.' })
  }

  res.json({ club: clubView(club) })
})

module.exports = router
