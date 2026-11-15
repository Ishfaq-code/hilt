import type { Organization } from '../types'

export type Stats = {
  users: number
  organizations: number
  memberships: number
  applications: number
  pendingApplications: number
}

export type AdminOrganization = Organization & {
  memberCount: number
  createdAt?: string
}

export type OrgStats = {
  name: string
  totalMembers: number
  paidMembers: number
  events: number
  roles: Record<string, number>
}
