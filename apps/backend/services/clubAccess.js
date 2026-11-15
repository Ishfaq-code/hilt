const { Types } = require('mongoose')
const ClubAccess = require('../models/ClubAccess')
const Membership = require('../models/Membership')
const Organization = require('../models/Organization')
const User = require('../models/User')
const {
  permissions,
  permissionsFor,
  holdsAll,
  assertAdministrator,
  requestError,
} = require('./clubRoles')

async function initializeAccess(organizationId) {
  const legacy = await Membership.collection
    .find({
      organizationId,
      organizationRole: { $in: ['owner', 'officer'] },
    })
    .toArray()
  const users = await User.find(
    { _id: { $in: legacy.map((member) => member.userId) } },
    '_id',
  ).lean()
  const active = new Set(users.map((user) => String(user._id)))
  const owners = legacy.filter(
    (member) =>
      member.organizationRole === 'owner' && active.has(String(member.userId)),
  )
  const officers = legacy.filter(
    (member) =>
      member.organizationRole === 'officer' &&
      active.has(String(member.userId)),
  )
  const administrators = owners.length ? owners : officers.slice(0, 1)
  const roles = []
  if (administrators.length) {
    roles.push({
      name: 'Club administrator',
      permissions,
      memberIds: administrators.map((member) => member._id),
    })
  }
  if (officers.length) {
    roles.push({
      name: 'Officer',
      permissions: ['settings', 'events', 'members', 'attendance'],
      memberIds: officers.map((member) => member._id),
    })
  }

  try {
    return (await ClubAccess.create({ _id: organizationId, roles })).toObject()
  } catch (error) {
    if (error.code !== 11000) throw error
    return ClubAccess.findById(organizationId).lean()
  }
}

async function accessFor(organizationId) {
  return (
    (await ClubAccess.findById(organizationId).lean()) ||
    initializeAccess(new Types.ObjectId(organizationId))
  )
}

async function clubPermissions(organizationId, user) {
  if (user.appRole === 'admin') return permissions
  const membership = await Membership.findOne(
    { organizationId, userId: user._id },
    '_id',
  ).lean()
  if (!membership) return []
  const access = await accessFor(organizationId)
  return permissionsFor(access.roles, membership._id)
}

async function changeAccess(organizationId, actor, change) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const access = await accessFor(organizationId)
    const membership = await Membership.findOne(
      { organizationId, userId: actor._id },
      '_id',
    ).lean()
    const granted =
      actor.appRole === 'admin'
        ? permissions
        : permissionsFor(access.roles, membership?._id)
    const result = await change(access, granted)
    if (!result) return

    const update = await ClubAccess.updateOne(
      { _id: organizationId, revision: access.revision },
      {
        $set: {
          roles: result.roles,
          departures: result.departures ?? access.departures,
        },
        $inc: { revision: 1 },
        $push: {
          history: {
            ...result.record,
            actorId: actor._id,
            at: new Date(),
            revision: access.revision + 1,
          },
        },
      },
    )
    if (update.modifiedCount) return result.returnValue
  }
  throw requestError(409, 'Club roles changed. Reload and try again.')
}

async function verifyRoleMembers(organizationId, memberIds, departures) {
  const leaving = new Set(departures.map(String))
  if (memberIds.some((id) => leaving.has(String(id)))) {
    throw requestError(409, 'A selected member is leaving the club.')
  }
  const memberships = await Membership.find(
    { organizationId, _id: { $in: memberIds } },
    'userId',
  ).lean()
  const active = await User.countDocuments({
    _id: { $in: memberships.map((member) => member.userId) },
  })
  if (memberships.length !== memberIds.length || active !== memberIds.length) {
    throw requestError(
      400,
      'Role assignments must be active members of this club.',
    )
  }
}

async function removeMembership(membership, actor) {
  const organizationId = membership.organizationId
  const id = String(membership._id)
  const self = String(membership.userId) === String(actor._id)
  if (!(await Organization.exists({ _id: organizationId }))) {
    if (!self && actor.appRole !== 'admin')
      throw requestError(403, 'You cannot remove this member.')
    await Membership.deleteOne({ _id: membership._id })
    return
  }

  await changeAccess(organizationId, actor, (access, granted) => {
    if (
      !self &&
      (!granted.includes('members') ||
        !holdsAll(granted, permissionsFor(access.roles, id)))
    ) {
      throw requestError(403, 'You cannot remove this member.')
    }
    if (access.departures.some((memberId) => String(memberId) === id)) return
    const before = access.roles.filter((role) =>
      role.memberIds.some((memberId) => String(memberId) === id),
    )
    const roles = access.roles.map((role) => ({
      ...role,
      memberIds: role.memberIds.filter((memberId) => String(memberId) !== id),
    }))
    if (before.length) assertAdministrator(roles)
    return {
      roles,
      departures: [...access.departures, membership._id],
      record: { action: 'member removed', memberId: membership._id, before },
    }
  })
  await Membership.deleteOne({ _id: membership._id })
  await ClubAccess.updateOne(
    { _id: organizationId },
    {
      $pull: { departures: membership._id },
      $inc: { revision: 1 },
    },
  )
}

async function createClub(organization, userId, applicationRoles) {
  if (!(await User.exists({ _id: userId }))) {
    throw requestError(409, 'The initial member’s account is unavailable.')
  }
  const membership = new Membership({
    userId,
    organizationId: organization._id,
    isPaid: organization.membershipFee === 0,
  })
  const roles = applicationRoles.map(({ assignApplicant, ...role }) => ({
    ...role,
    memberIds: assignApplicant ? [membership._id] : [],
  }))
  try {
    await membership.save()
    await ClubAccess.create({ _id: organization._id, roles })
    await organization.save()
    return organization
  } catch (error) {
    await ClubAccess.deleteOne({ _id: organization._id })
    await Membership.deleteOne({ _id: membership._id })
    throw error
  }
}

module.exports = {
  accessFor,
  clubPermissions,
  changeAccess,
  verifyRoleMembers,
  removeMembership,
  createClub,
}
