const mongoose = require('mongoose')
const Membership = require('../models/Membership')
const Organization = require('../models/Organization')

async function requireOrganizationAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication is required.' })
  }

  const { organizationId } = req.params
  if (!mongoose.isValidObjectId(organizationId)) {
    return res.status(404).json({ error: 'Organization not found.' })
  }

  try {
    const organizationExists = await Organization.exists({ _id: organizationId })
    if (!organizationExists) {
      return res.status(404).json({ error: 'Organization not found.' })
    }

    if (req.user.appRole === 'admin') {
      return next()
    }

    const membership = await Membership.findOne({
      userId: req.user._id,
      organizationId,
      organizationRole: { $in: ['officer', 'owner'] },
    })

    if (!membership) {
      return res.status(403).json({ error: 'Organization officer access is required.' })
    }

    return next()
  } catch (error) {
    return next(error)
  }
}

module.exports = requireOrganizationAdmin
