import { Link } from 'react-router-dom'
import { secondaryClass } from '../ui/styles'
import { SortablePaginatedTable } from './SortablePaginatedTable'
import type { Administration } from '../../hooks/useAdministration'
import type { AdminOrganization } from '../../types/administration'

type AdminEventRow = {
  id: string
  name: string
  organizationName: string
  startDatetime: string | null
  endDatetime: string | null
  attendanceCount: number
  rsvpCount: number
}

const money = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
})

function eventStatus(endDatetime: string | null) {
  return endDatetime && Date.parse(endDatetime) >= Date.now()
    ? 'Upcoming'
    : 'Prior'
}

export function AdminStatisticsTables({
  organizations,
  moderate,
}: {
  organizations: AdminOrganization[]
  moderate: Administration['moderate']
}) {
  const organizationColumns = [
    {
      key: 'name',
      label: 'Organization',
      sortValue: (organization: AdminOrganization) => organization.name,
      render: (organization: AdminOrganization) => (
        <span className="font-semibold">{organization.name}</span>
      ),
    },
    {
      key: 'members',
      label: 'Members',
      sortValue: (organization: AdminOrganization) => organization.memberCount,
      render: (organization: AdminOrganization) => organization.memberCount,
    },
    {
      key: 'dues',
      label: 'Collected dues',
      sortValue: (organization: AdminOrganization) =>
        organization.collectedDues,
      render: (organization: AdminOrganization) =>
        money.format(organization.collectedDues),
    },
    {
      key: 'events',
      label: 'Published events',
      sortValue: (organization: AdminOrganization) =>
        organization.publishedEventCount,
      render: (organization: AdminOrganization) =>
        organization.publishedEventCount,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (organization: AdminOrganization) => (
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/admin/organizations/${organization._id}/manage?tab=roles`}
            className={secondaryClass}
          >
            Manage
          </Link>
          <button
            type="button"
            className={`${secondaryClass} text-red-700`}
            onClick={() => void moderate(organization)}
          >
            Remove
          </button>
        </div>
      ),
    },
  ]

  const events: AdminEventRow[] = organizations.flatMap((organization) =>
    organization.events.map((event) => ({
      id: organization._id + '-' + event._id,
      name: event.name || 'Untitled event',
      organizationName: organization.name,
      startDatetime: event.startDatetime,
      endDatetime: event.endDatetime,
      attendanceCount: event.attendanceCount,
      rsvpCount: event.rsvpCount,
    })),
  )

  const eventColumns = [
    {
      key: 'name',
      label: 'Event',
      sortValue: (event: AdminEventRow) => event.name,
      render: (event: AdminEventRow) => (
        <span className="font-semibold">{event.name}</span>
      ),
    },
    {
      key: 'organization',
      label: 'Organization',
      sortValue: (event: AdminEventRow) => event.organizationName,
      render: (event: AdminEventRow) => event.organizationName,
    },
    {
      key: 'timeframe',
      label: 'Time frame',
      sortValue: (event: AdminEventRow) =>
        event.startDatetime ? Date.parse(event.startDatetime) : null,
      render: (event: AdminEventRow) => {
        const status = eventStatus(event.endDatetime)
        return (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status === 'Upcoming' ? 'bg-[#edf2eb] text-active' : 'bg-amber-100 text-amber-800'}`}
          >
            {status}
          </span>
        )
      },
    },
    {
      key: 'rsvps',
      label: 'RSVPs',
      sortValue: (event: AdminEventRow) => event.rsvpCount,
      render: (event: AdminEventRow) => event.rsvpCount,
    },
    {
      key: 'attendees',
      label: 'Attendees',
      sortValue: (event: AdminEventRow) => event.attendanceCount,
      render: (event: AdminEventRow) => event.attendanceCount,
    },
  ]

  return (
    <div className="mt-8 space-y-8">
      <section>
        <h2 className="mb-3 text-xl font-semibold">Organizations</h2>
        <p className="mb-3 text-sm text-muted">
          Collected dues are paid membership count multiplied by the
          organization’s membership fee.
        </p>
        <SortablePaginatedTable
          rows={organizations}
          columns={organizationColumns}
          rowKey={(organization) => organization._id}
          label="Organizations"
          emptyMessage="No organizations yet."
        />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Published events</h2>
        <p className="mb-3 text-sm text-muted">
          RSVP totals show current sign-ups. Attendee totals include active
          check-ins; reversed check-ins are excluded.
        </p>
        <SortablePaginatedTable
          rows={events}
          columns={eventColumns}
          rowKey={(event) => event.id}
          label="Published events"
          emptyMessage="No published events yet."
        />
      </section>
    </div>
  )
}
