import { SortablePaginatedTable } from '../ui/SortablePaginatedTable'
import type { TableColumn } from '../ui/SortablePaginatedTable'

export type EventStatisticsRow = {
  id: string
  name: string
  organizationName: string
  startDatetime: string | null
  endDatetime: string | null
  rsvpCount: number
  attendanceCount: number
}

function eventStatus(endDatetime: string | null) {
  return endDatetime && Date.parse(endDatetime) >= Date.now()
    ? 'Upcoming'
    : 'Prior'
}

export function PublishedEventsTable({
  events,
  showOrganization = true,
}: {
  events: EventStatisticsRow[]
  showOrganization?: boolean
}) {
  const columns: TableColumn<EventStatisticsRow>[] = [
    {
      key: 'name',
      label: 'Event',
      sortValue: (event) => event.name,
      render: (event) => <span className="font-semibold">{event.name}</span>,
    },
    ...(showOrganization
      ? [
          {
            key: 'organization',
            label: 'Club',
            sortValue: (event: EventStatisticsRow) => event.organizationName,
            render: (event: EventStatisticsRow) => event.organizationName,
          },
        ]
      : []),
    {
      key: 'timeframe',
      label: 'Time frame',
      sortValue: (event) =>
        event.startDatetime ? Date.parse(event.startDatetime) : null,
      render: (event) => {
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
      sortValue: (event) => event.rsvpCount,
      render: (event) => event.rsvpCount,
    },
    {
      key: 'attendees',
      label: 'Attendees',
      sortValue: (event) => event.attendanceCount,
      render: (event) => event.attendanceCount,
    },
  ]

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xl font-semibold">Published Events</h2>
      <p className="mb-3 text-sm text-muted">
        RSVP totals show current sign-ups. Attendee totals include active
        check-ins; reversed check-ins are excluded.
      </p>
      <SortablePaginatedTable
        rows={events}
        columns={columns}
        rowKey={(event) => event.id}
        label="Published events"
        emptyMessage="No published events yet."
      />
    </section>
  )
}
