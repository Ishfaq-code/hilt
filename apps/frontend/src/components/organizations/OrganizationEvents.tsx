import { useRef, useState } from 'react'
import type { OrganizationManagement } from '../../hooks/useOrganizationManagement'
import { usePagination } from '../../hooks/usePagination'
import { isEventInProgress } from '../../lib/events'
import type { Organization } from '../../types'
import type { EditableEvent, ManagedEvent } from '../../types/management'
import { EventEditor } from '../events/EventEditor'
import { Dialog } from '../ui/Dialog'
import { Pagination } from '../ui/Pagination'
import { buttonClass, inputClass, panelClass } from '../ui/styles'
import { ManagedEventRow } from './ManagedEventRow'

type Props = Pick<
  OrganizationManagement,
  'events' | 'saved' | 'deleteEvent'
> & {
  club: Pick<Organization, '_id' | 'name'>
  totals?: NonNullable<OrganizationManagement['statistics']>['eventAttendance']
  canEdit: boolean
  now: number
  onAttendance?: (event: ManagedEvent) => void
  onOpenClub: () => void
}

type EventAction = { kind: 'new' } | { kind: 'edit'; event: EditableEvent }

const filters = [
  { id: 'upcoming', label: 'Upcoming', empty: 'No upcoming events.' },
  { id: 'draft', label: 'Drafts', empty: 'No drafts.' },
  { id: 'past', label: 'Past', empty: 'No past events.' },
  { id: 'all', label: 'All', empty: 'No events yet.' },
] as const

type EventFilter = (typeof filters)[number]
const eventOrder = { live: 0, upcoming: 1, draft: 2, past: 3 }

function eventPhase(
  event: EditableEvent,
  now: number,
): keyof typeof eventOrder {
  if (event.status === 'draft') return 'draft'
  if (Date.parse(event.startDatetime) > now) return 'upcoming'
  return isEventInProgress(event, now) ? 'live' : 'past'
}

function compareEventTimes(
  left: EditableEvent,
  right: EditableEvent,
  descending: boolean,
) {
  const first = Date.parse(left.startDatetime ?? '')
  const second = Date.parse(right.startDatetime ?? '')
  if (!Number.isFinite(first)) return Number.isFinite(second) ? 1 : 0
  if (!Number.isFinite(second)) return -1
  return descending ? second - first : first - second
}

export function OrganizationEvents({
  club,
  events,
  totals,
  canEdit,
  now,
  onAttendance,
  onOpenClub,
  saved,
  deleteEvent,
}: Props) {
  const heading = useRef<HTMLHeadingElement>(null)
  const [action, setAction] = useState<EventAction | null>(null)
  const [query, setQuery] = useState('')
  const [selectedFilter, setFilter] = useState<EventFilter>(filters[0])

  const filter =
    !canEdit && selectedFilter.id === 'draft' ? filters[0] : selectedFilter
  const search = query.trim().toLowerCase()
  const matchingEvents = events
    .map((event) => ({ event, phase: eventPhase(event, now) }))
    .filter(({ event, phase }) => {
      const matchesFilter =
        filter.id === 'all' ||
        filter.id === phase ||
        (filter.id === 'upcoming' && phase === 'live')
      if (!matchesFilter || !search) return matchesFilter

      return [
        event.name || 'Untitled event',
        event.description,
        event.place,
        ...event.tags,
        phase === 'draft' ? 'draft' : '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(search)
    })
    .sort(
      (left, right) =>
        eventOrder[left.phase] - eventOrder[right.phase] ||
        compareEventTimes(left.event, right.event, left.phase === 'past'),
    )
  const { pageItems, page, pageCount, setPage } = usePagination(matchingEvents)
  const totalsByEvent = new Map(totals?.map((item) => [item.eventId, item]))
  const close = () => setAction(null)

  async function save(message: string) {
    close()
    await saved(message)
  }

  return (
    <section className="@container">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1
          ref={heading}
          tabIndex={-1}
          className="text-3xl font-semibold tracking-tight"
        >
          Events
        </h1>
        {canEdit && (
          <button
            type="button"
            className={buttonClass}
            aria-haspopup="dialog"
            onClick={() => setAction({ kind: 'new' })}
          >
            + New event
          </button>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line">
        <div role="group" aria-label="Filter events" className="flex gap-x-4">
          {filters
            .filter((option) => option.id !== 'draft' || canEdit)
            .map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={filter.id === option.id}
                className="min-h-11 border-b-2 border-transparent text-sm font-medium text-muted hover:text-ink aria-pressed:border-accent aria-pressed:text-ink"
                onClick={() => {
                  setFilter(option)
                  setPage(1)
                }}
              >
                {option.label}
              </button>
            ))}
        </div>
        <label className="w-full pb-2 @min-[36rem]:max-w-60">
          <span className="sr-only">Search events</span>
          <input
            type="search"
            className={inputClass}
            placeholder="Search events"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
          />
        </label>
      </div>
      {pageItems.length ? (
        <ul
          aria-label="Managed events"
          className={panelClass + ' mt-4 divide-y divide-line'}
        >
          {pageItems.map(({ event, phase }) => (
            <ManagedEventRow
              key={event._id}
              club={club}
              event={event}
              live={phase === 'live'}
              showDraftStatus={filter.id !== 'draft'}
              totals={totalsByEvent.get(event._id)}
              onOpenClub={onOpenClub}
              onEdit={
                canEdit ? () => setAction({ kind: 'edit', event }) : undefined
              }
              onAttendance={
                onAttendance && event.status !== 'draft'
                  ? () => onAttendance(event)
                  : undefined
              }
              onDelete={canEdit ? () => void deleteEvent(event) : undefined}
            />
          ))}
        </ul>
      ) : (
        <p className={panelClass + ' mt-4 p-4 text-sm text-muted'}>
          {search ? 'No events match your search.' : filter.empty}
        </p>
      )}
      <Pagination
        label="Events"
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
        headingRef={heading}
      />
      {(action?.kind === 'new' || action?.kind === 'edit') && (
        <Dialog
          title={action.kind === 'new' ? 'New event' : 'Edit'}
          onClose={close}
        >
          <EventEditor
            organizationId={club._id}
            event={action.kind === 'edit' ? action.event : undefined}
            onSaved={(status) =>
              save(
                status === 'draft'
                  ? 'Draft saved'
                  : action.kind === 'new' || action.event.status === 'draft'
                    ? 'Event published'
                    : 'Changes saved',
              )
            }
            onCancel={close}
          />
        </Dialog>
      )}
    </section>
  )
}
