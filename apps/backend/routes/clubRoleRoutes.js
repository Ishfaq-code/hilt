const express = require('express')
const { isObjectIdOrHexString, Types } = require('mongoose')
const requireAuth = require('../middleware/requireAuth')
const requireAppAdmin = require('../middleware/requireAppAdmin')
const requireClubPermission = require('../middleware/requireClubPermission')
const {
  accessFor,
  changeAccess,
  verifyRoleMembers,
} = require('../services/clubAccess')
const {
  assertAdministrator,
  assertRoleNames,
  holdsAll,
  parseRole,
  parseMemberIds,
  requestError,
} = require('../services/clubRoles')

const router = express.Router({ mergeParams: true })

function canEdit(granted, role) {
  if (
    !granted.includes('roles') ||
    (role && !holdsAll(granted, role.permissions))
  ) {
    throw requestError(
      403,
      'You can only manage roles within your own permissions.',
    )
  }
}

function capacity(role) {
  if (role.maxMembers !== null && role.memberIds.length > role.maxMembers) {
    throw requestError(
      409,
      'The number of assigned members exceeds this role’s capacity.',
    )
  }
}

function findRole(roles, id) {
  const role = roles.find((role) => String(role._id) === id)
  if (!role) throw requestError(404, 'Role not found.')
  return role
}

async function saveRole(req, id) {
  const { organizationId } = req.params
  const settings = parseRole(req.body, ['memberIds'])
  const memberIds = parseMemberIds(req.body.memberIds)
  const role = { _id: new Types.ObjectId(id), ...settings, memberIds }
  capacity(role)

  return changeAccess(organizationId, req.user, async (access, granted) => {
    const existing =
      req.method === 'PUT' ? findRole(access.roles, id) : undefined
    canEdit(granted, existing)
    canEdit(granted, role)
    await verifyRoleMembers(organizationId, memberIds, access.departures)

    const roles = existing
      ? access.roles.map((item) => (item === existing ? role : item))
      : [...access.roles, role]
    assertRoleNames(roles)
    assertAdministrator(roles)
    return {
      roles,
      record: {
        action: existing ? 'role updated' : 'role created',
        before: existing ?? null,
        after: role,
        _id: new Types.ObjectId(),
      },
      returnValue: role,
    }
  })
}

router.get(
  '/manage/permissions',
  requireAuth,
  requireClubPermission(),
  (req, res) => {
    res.json(req.clubPermissions)
  },
)

router.get(
  '/roles',
  requireAuth,
  requireClubPermission('roles'),
  async (req, res) => {
    const access = await accessFor(req.params.organizationId)
    res.json(access.roles)
  },
)

router.get(
  '/roles/history',
  requireAuth,
  requireAppAdmin,
  requireClubPermission(),
  async (req, res) => {
    const access = await accessFor(req.params.organizationId)
    res.json(access.history.slice(-50).reverse())
  },
)

router.post(
  '/roles',
  requireAuth,
  requireClubPermission('roles'),
  async (req, res) => {
    res.status(201).json(await saveRole(req, new Types.ObjectId().toString()))
  },
)

router.put(
  '/roles/:roleId',
  requireAuth,
  requireClubPermission('roles'),
  async (req, res) => {
    if (!isObjectIdOrHexString(req.params.roleId))
      throw requestError(404, 'Role not found.')
    res.json(await saveRole(req, req.params.roleId.toLowerCase()))
  },
)

router.delete(
  '/roles/:roleId',
  requireAuth,
  requireClubPermission('roles'),
  async (req, res) => {
    await changeAccess(
      req.params.organizationId,
      req.user,
      (access, granted) => {
        const role = findRole(access.roles, req.params.roleId.toLowerCase())
        canEdit(granted, role)
        const roles = access.roles.filter((item) => item !== role)
        assertAdministrator(roles)
        return {
          roles,
          record: {
            action: 'role deleted',
            before: role,
            after: null,
            _id: new Types.ObjectId(),
          },
        }
      },
    )
    res.sendStatus(204)
  },
)

router.post(
  '/roles/history/:changeId/undo',
  requireAuth,
  requireAppAdmin,
  requireClubPermission(),
  async (req, res) => {
    const { organizationId, changeId } = req.params
    await changeAccess(organizationId, req.user, async (access) => {
      const change = access.history.find(
        (item) => String(item._id) === changeId,
      )
      if (!change) throw requestError(404, 'Role change not found.')
      if (
        !change.action.startsWith('role ') ||
        change.action === 'role restored' ||
        change.revision !== access.revision
      ) {
        throw requestError(
          409,
          'Review later changes before restoring this role.',
        )
      }
      const previous = change.before
      const roleId = String((previous ?? change.after)._id)
      const roles = access.roles.filter((item) => String(item._id) !== roleId)
      if (previous) {
        await verifyRoleMembers(
          organizationId,
          previous.memberIds,
          access.departures,
        )
        roles.push(previous)
      }
      assertRoleNames(roles)
      assertAdministrator(roles)
      return {
        roles,
        record: {
          action: 'role restored',
          before: change.after,
          after: previous,
          _id: new Types.ObjectId(),
        },
      }
    })
    res.sendStatus(204)
  },
)

module.exports = router
