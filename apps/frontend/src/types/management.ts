import type { Organization } from '../types'

export type Member = {
  _id: string
  organizationRole: 'student' | 'officer' | 'owner'
  isPaid: boolean
  userId: { _id?: string; firstName: string; lastName: string; email: string }
}

export type Stats = {
  totalMembers: number
  paidMembers: number
  events: number
  roles: Record<string, number>
}

export type Membership = {
  organizationRole: 'student' | 'officer' | 'owner'
  organizationId: { _id: string }
}

export type ManagedEvent = NonNullable<Organization['events']>[number]
export type DraftEvent = Omit<
  ManagedEvent,
  'startDatetime' | 'endDatetime' | 'status'
> & {
  status: 'draft'
  startDatetime: null
  endDatetime: null
  draftSchedule?: { date?: string; startTime?: string; endTime?: string }
}
export type EditableEvent = DraftEvent | ManagedEvent

export type JoinedOrganization = Organization & { _membershipRole: string }
