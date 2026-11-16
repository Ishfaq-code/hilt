const Application = require('../models/Application')
const Membership = require('../models/Membership')
const Organization = require('../models/Organization')
const User = require('../models/User')

async function getAdminStatistics() {
  const [
    users,
    organizations,
    memberships,
    applications,
    memberIds,
    applicationCounts,
  ] = await Promise.all([
    User.countDocuments(),
    Organization.countDocuments(),
    Membership.countDocuments(),
    Application.countDocuments(),
    Membership.distinct('userId'),
    Application.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ])

  const applicationStatuses = { approved: 0, denied: 0, pending: 0 }
  for (const item of applicationCounts) {
    if (item._id in applicationStatuses)
      applicationStatuses[item._id] = item.count
  }
  const membersWithOrganizations = memberIds.length

  return {
    users,
    organizations,
    memberships,
    applications,
    pendingApplications: applicationStatuses.pending,
    membersWithOrganizations,
    membersWithoutOrganizations: Math.max(0, users - membersWithOrganizations),
    applicationStatuses,
  }
}

module.exports = { getAdminStatistics }
