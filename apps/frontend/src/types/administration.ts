import type { Organization } from '../types'

export type Stats = {
  users: number
  organizations: number
  memberships: number
  applications: number
  pendingApplications: number
  membersWithOrganizations: number
  membersWithoutOrganizations: number
  applicationStatuses: { approved: number; denied: number; pending: number }
}

type AdminEvent = Omit<
  NonNullable<Organization['events']>[number],
  'startDatetime' | 'endDatetime'
> & {
  startDatetime: string | null
  endDatetime: string | null
  attendanceCount: number
  rsvpCount: number
}

export type AdminOrganization = Omit<Organization, 'events'> & {
  memberCount: number
  collectedDues: number
  publishedEventCount: number
  events: AdminEvent[]
  createdAt?: string
}

export type OrgStats = {
  organizationId: string
  name: string
  membershipFee: number
  totalMembers: number
  paidMembers: number
  events?: number
  unpaidMembers: number
  currentRevenue: number
  projectedRevenue: number
  eventAttendance: { eventId: string; name: string; attendance: number }[]
}
