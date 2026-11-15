const express = require('express')
const { isObjectIdOrHexString } = require('mongoose')
const Membership = require('../models/Membership')
const Organization = require('../models/Organization')
const requireAppAdmin = require('../middleware/requireAppAdmin')
const requireAuth = require('../middleware/requireAuth')
const requireClubPermission = require('../middleware/requireClubPermission')
const {
  accessFor,
  clubPermissions,
  removeMembership,
} = require('../services/clubAccess')
const { permissions, permissionsFor } = require('../services/clubRoles')
const { withTags } = require('../services/clubTags')

const router = express.Router()

function publicMembership(membership) {
  const { organizationRole, ...data } = membership.toObject()
  return data
}

router.get('/mine', requireAuth, async (req, res) => {
  const memberships = await Membership.find({ userId: req.user._id })
    .populate(
      'organizationId',
      'name description tags category profile assets membershipFee events',
    )
    .sort({ createdAt: -1 })
  const items = await Promise.all(
    memberships
      .filter((member) => member.organizationId)
      .map(async (member) => {
        const data = publicMembership(member)
        const club = withTags(data.organizationId)
        const access = await accessFor(club._id)
        const roles = access.roles.filter((role) =>
          role.memberIds.some((id) => id.equals(member._id)),
        )
        club.events = club.events.filter((event) => event.status !== 'draft')

        return {
          ...data,
          organizationId: club,
          roles: roles.map(({ _id, name }) => ({ _id, name })),
          permissions:
            req.user.appRole === 'admin'
              ? permissions
              : permissionsFor(roles, member._id),
        }
      }),
  )
  res.json(items)
})

router.get('/', requireAuth, requireAppAdmin, async (req, res) => {
  const memberships = await Membership.find()
  res.json(memberships.map(publicMembership))
})

router.get(
  '/organization/:organizationId',
  requireAuth,
  requireClubPermission('members', 'roles'),
  async (req, res) => {
    const memberships = await Membership.find({
      organizationId: req.params.organizationId,
    })
    res.json(memberships.map(publicMembership))
  },
)

router.get('/:membershipId', requireAuth, async (req, res) => {
  if (!isObjectIdOrHexString(req.params.membershipId)) {
    return res.status(404).json({ error: 'Membership not found.' })
  }
  const membership = await Membership.findById(req.params.membershipId)
  if (!membership)
    return res.status(404).json({ error: 'Membership not found.' })
  if (!membership.userId.equals(req.user._id)) {
    return res
      .status(403)
      .json({ error: 'You can only access your own membership.' })
  }
  res.json(publicMembership(membership))
})

router.post('/', requireAuth, async (req, res, next) => {
  const body = req.body
  if (
    !body ||
    Object.keys(body).length !== 1 ||
    !isObjectIdOrHexString(body.organizationId)
  ) {
    return res
      .status(400)
      .json({ error: 'A valid organizationId is required.' })
  }
  const organization = await Organization.findById(body.organizationId)
  if (!organization) return res.status(404).json({ error: 'Club not found.' })
  try {
    const membership = await Membership.create({
      userId: req.user._id,
      organizationId: organization._id,
      isPaid: organization.membershipFee === 0,
    })
    return res.status(201).json(publicMembership(membership))
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ error: 'You already have a membership in this club.' })
    }
    return next(error)
  }
})

router.patch('/:membershipId', requireAuth, async (req, res) => {
  if (!isObjectIdOrHexString(req.params.membershipId)) {
    return res.status(404).json({ error: 'Membership not found.' })
  }
  const membership = await Membership.findById(req.params.membershipId)
  if (!membership)
    return res.status(404).json({ error: 'Membership not found.' })
  const granted = await clubPermissions(membership.organizationId, req.user)
  if (!granted.includes('members')) {
    return res
      .status(403)
      .json({ error: 'You don’t have permission to manage members.' })
  }
  if (
    !req.body ||
    Object.keys(req.body).length !== 1 ||
    typeof req.body.isPaid !== 'boolean'
  ) {
    return res.status(400).json({ error: 'Provide a valid dues update.' })
  }
  membership.isPaid = req.body.isPaid
  await membership.save()
  res.json(publicMembership(membership))
})

router.delete('/:membershipId', requireAuth, async (req, res) => {
  if (!isObjectIdOrHexString(req.params.membershipId)) {
    return res.status(404).json({ error: 'Membership not found.' })
  }
  const membership = await Membership.findById(req.params.membershipId)
  if (!membership)
    return res.status(404).json({ error: 'Membership not found.' })
  await removeMembership(membership, req.user)
  res.sendStatus(204)
})

module.exports = router
