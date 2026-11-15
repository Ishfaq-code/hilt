export const permissionLabels = {
  settings: 'Manage club info',
  editPages: 'Edit pages',
  publishPages: 'Publish pages',
  events: 'Manage events',
  members: 'Manage members',
  roles: 'Administer roles',
  attendance: 'Manage attendance',
  communications: 'Manage communications',
  integrations: 'Manage integrations',
}

export type ClubPermission = keyof typeof permissionLabels
export const clubPermissions = Object.keys(permissionLabels) as ClubPermission[]

export type RoleSettings = {
  name: string
  permissions: ClubPermission[]
  maxMembers: number | null
}

export type ClubRole = RoleSettings & { _id: string; memberIds: string[] }
export type RoleSummary = Pick<ClubRole, '_id' | 'name'>
export type ApplicationRole = RoleSettings & { assignApplicant: boolean }

export function capacityLabel(limit: number | null) {
  return limit === null
    ? 'Unlimited'
    : limit + (limit === 1 ? ' member' : ' members')
}

export type RoleChange = {
  _id?: string
  action: string
  at: string
  actorId: string
  before?: ClubRole | null
  after?: ClubRole | null
}
