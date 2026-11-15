const { isObjectIdOrHexString, Types } = require('mongoose')

const permissions = [
  'settings',
  'editPages',
  'publishPages',
  'events',
  'members',
  'roles',
  'attendance',
  'communications',
  'integrations',
]

function requestError(status, message) {
  return Object.assign(new Error(message), { status, name: 'ClubRoleError' })
}

function permissionsFor(roles, membershipId) {
  if (!membershipId) return []
  const id = String(membershipId)
  return [
    ...new Set(
      roles.flatMap((role) =>
        role.memberIds.some((memberId) => String(memberId) === id)
          ? role.permissions
          : [],
      ),
    ),
  ]
}

function holdsAll(granted, required = permissions) {
  return required.every((permission) => granted.includes(permission))
}

function hasAdministrator(roles) {
  const granted = new Map()
  for (const role of roles) {
    for (const memberId of role.memberIds) {
      const id = String(memberId)
      if (!granted.has(id)) granted.set(id, new Set())
      for (const permission of role.permissions) granted.get(id).add(permission)
    }
  }
  return [...granted.values()].some((keys) =>
    permissions.every((permission) => keys.has(permission)),
  )
}

function assertAdministrator(roles) {
  if (!hasAdministrator(roles)) {
    throw requestError(409, 'Keep at least one member with full club access.')
  }
}

function parseRole(input, allowed = []) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).some(
      (key) => !['name', 'permissions', 'maxMembers', ...allowed].includes(key),
    )
  ) {
    throw requestError(400, 'Provide valid role details.')
  }
  const { permissions: keys, maxMembers = null } = input
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  if (!name || name.length > 80)
    throw requestError(400, 'Enter a role name up to 80 characters.')
  if (!Array.isArray(keys) || keys.some((key) => !permissions.includes(key))) {
    throw requestError(400, 'Choose valid club permissions.')
  }
  if (
    maxMembers !== null &&
    (!Number.isSafeInteger(maxMembers) || maxMembers < 1)
  ) {
    throw requestError(
      400,
      'Enter a positive role capacity or choose Unlimited.',
    )
  }
  return { name, permissions: [...new Set(keys)], maxMembers }
}

function assertRoleNames(roles) {
  const names = roles.map((role) => role.name.toLowerCase())
  if (new Set(names).size !== names.length) {
    throw requestError(409, 'Role names must be unique within a club.')
  }
}

function parseApplicationRoles(input) {
  if (input === undefined) {
    return [
      { name: 'President', permissions, maxMembers: 1, assignApplicant: true },
    ]
  }
  if (!Array.isArray(input) || !input.length)
    throw requestError(400, 'Set up at least one club role.')
  const roles = input.map((item) => {
    const role = parseRole(item, ['assignApplicant'])
    if (typeof item.assignApplicant !== 'boolean') {
      throw requestError(400, 'Choose whether the applicant holds each role.')
    }
    return { ...role, assignApplicant: item.assignApplicant }
  })
  assertRoleNames(roles)
  const granted = roles
    .filter((role) => role.assignApplicant)
    .flatMap((role) => role.permissions)
  if (!holdsAll(granted))
    throw requestError(
      400,
      'Assign yourself roles that give you full club access.',
    )
  return roles
}

function parseMemberIds(ids) {
  if (
    !Array.isArray(ids) ||
    ids.some((id) => typeof id !== 'string' || !isObjectIdOrHexString(id))
  ) {
    throw requestError(400, 'Choose valid club members.')
  }
  return [...new Set(ids.map((id) => id.toLowerCase()))].map(
    (id) => new Types.ObjectId(id),
  )
}

module.exports = {
  permissions,
  permissionsFor,
  holdsAll,
  hasAdministrator,
  assertAdministrator,
  parseRole,
  assertRoleNames,
  parseApplicationRoles,
  parseMemberIds,
  requestError,
}
