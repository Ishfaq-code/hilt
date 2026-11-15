const { isObjectIdOrHexString } = require('mongoose')
const Organization = require('../models/Organization')
const { clubPermissions } = require('../services/clubAccess')

module.exports = function requireClubPermission(...allowed) {
  return async (req, res, next) => {
    const { organizationId } = req.params
    if (
      !isObjectIdOrHexString(organizationId) ||
      !(await Organization.exists({ _id: organizationId }))
    ) {
      return res.status(404).json({ error: 'Club not found.' })
    }
    const granted = await clubPermissions(organizationId, req.user)
    if (
      allowed.length &&
      !allowed.some((permission) => granted.includes(permission))
    ) {
      return res
        .status(403)
        .json({ error: 'You don’t have permission for this club action.' })
    }
    req.clubPermissions = granted
    next()
  }
}
