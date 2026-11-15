import { EventEditor } from '../events/EventEditor'
import { buttonClass, panelClass, secondaryClass } from '../ui/styles'

import type { OrganizationManagement } from '../../hooks/useOrganizationManagement'

type Props = Pick<
  OrganizationManagement,
  | 'events'
  | 'creatingEvent'
  | 'setCreatingEvent'
  | 'editingEvent'
  | 'setEditingEvent'
  | 'saved'
  | 'deleteEvent'
> & { organizationId: string }

export function OrganizationEvents({
  organizationId,
  events,
  creatingEvent,
  setCreatingEvent,
  editingEvent,
  setEditingEvent,
  saved,
  deleteEvent,
}: Props) {
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Events</h1>
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            setCreatingEvent((current) => !current)
            setEditingEvent(null)
          }}
        >
          + New event
        </button>
      </div>
      {creatingEvent && (
        <EventEditor
          organizationId={organizationId}
          onSaved={() => saved('Event published.')}
          onCancel={() => setCreatingEvent(false)}
        />
      )}
      {events.length ? (
        <ul className={`${panelClass} mt-4 divide-y divide-line`}>
          {events.map((event) => (
            <li
              key={event._id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{event.name}</h2>
                  {event.private && (
                    <span className="rounded bg-paper px-2 py-0.5 text-xs font-semibold text-muted">
                      Members only
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted">
                  {new Date(event.startDatetime).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}{' '}
                  ·{' '}
                  {new Date(event.startDatetime).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                  {event.place ? ` · ${event.place}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {event.type && (
                  <span className="text-xs text-muted">{event.type}</span>
                )}
                <button
                  className={secondaryClass}
                  onClick={() => {
                    setEditingEvent(event)
                    setCreatingEvent(false)
                  }}
                >
                  Edit
                </button>
                <button
                  className={`${secondaryClass} text-red-700`}
                  onClick={() => void deleteEvent(event)}
                >
                  Delete
                </button>
              </div>
              {editingEvent?._id === event._id && (
                <div className="w-full">
                  <EventEditor
                    organizationId={organizationId}
                    event={event}
                    onSaved={() => saved('Event changes saved.')}
                    onCancel={() => setEditingEvent(null)}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className={`${panelClass} mt-4 p-4 text-sm text-muted`}>
          No events yet.
        </p>
      )}
    </section>
  )
}
