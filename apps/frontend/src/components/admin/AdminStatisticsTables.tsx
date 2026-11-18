import { Link } from 'react-router-dom'
import { secondaryClass } from '../ui/styles'
import { PublishedEventsTable } from '../events/PublishedEventsTable'
import { SortablePaginatedTable } from '../ui/SortablePaginatedTable'
import type { Administration } from '../../hooks/useAdministration'
import type { AdminOrganization } from '../../types/administration'
import type { EventStatisticsRow } from '../events/PublishedEventsTable'

const money = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
})

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
      label: 'Club',
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

  const events: EventStatisticsRow[] = organizations.flatMap((organization) =>
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

  return (
    <div className="mt-8 space-y-8">
      <section>
        <h2 className="mb-3 text-xl font-semibold">Clubs</h2>
        <p className="mb-3 text-sm text-muted">
          Collected dues are paid membership count multiplied by the club’s
          membership fee.
        </p>
        <SortablePaginatedTable
          rows={organizations}
          columns={organizationColumns}
          rowKey={(organization) => organization._id}
          label="Clubs"
          emptyMessage="No clubs yet."
        />
      </section>

      <PublishedEventsTable events={events} />
    </div>
  )
}
