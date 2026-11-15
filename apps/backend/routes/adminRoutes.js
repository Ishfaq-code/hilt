const express = require('express')
const Application = require('../models/Application')
const Membership = require('../models/Membership')
const Organization = require('../models/Organization')
const User = require('../models/User')
const requireAuth = require('../middleware/requireAuth')
const requireAppAdmin = require('../middleware/requireAppAdmin')

const router = express.Router()

router.use(requireAuth, requireAppAdmin)

router.get('/statistics', async (req, res, next) => {
  try {
    const [users, organizations, memberships, applications, pendingApplications] = await Promise.all([
      User.countDocuments(),
      Organization.countDocuments(),
      Membership.countDocuments(),
      Application.countDocuments(),
      Application.countDocuments({ status: 'pending' }),
    ])
    return res.status(200).json({ users, organizations, memberships, applications, pendingApplications })
  } catch (error) { return next(error) }
})

router.get('/organizations', async (req, res, next) => {
  try {
    const organizations = await Organization.find({}, 'name description category profile assets membershipFee events createdAt').lean()
    const counts = await Membership.aggregate([
      { $group: { _id: '$organizationId', members: { $sum: 1 } } },
    ])
    const memberCounts = new Map(counts.map((item) => [String(item._id), item.members]))
    return res.status(200).json(organizations.map((organization) => ({
      ...organization,
      memberCount: memberCounts.get(String(organization._id)) || 0,
    })))
  } catch (error) { return next(error) }
})

module.exports = router
