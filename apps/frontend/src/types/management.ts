import type { Organization } from '../types'
import type { ClubPermission, RoleSummary } from './clubRoles'

export type Member = {
  _id: string
  roles: RoleSummary[]
  permissions: ClubPermission[]
  isPaid: boolean
  userId: { _id?: string; firstName: string; lastName: string; email: string }
}

export type Membership = {
  _id: string
  organizationId: { _id: string }
  roles: RoleSummary[]
  permissions: ClubPermission[]
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

export type JoinedOrganization = Organization & {
  roles: RoleSummary[]
  permissions: ClubPermission[]
}
