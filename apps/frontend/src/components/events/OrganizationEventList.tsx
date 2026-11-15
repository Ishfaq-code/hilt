import type { ManagedEvent } from '../../types/management'
import { Icon } from '../ui/Icon'

export function OrganizationEventList({ events }: { events: ManagedEvent[] }) {
  return (
    <div className="py-5">
      {events.length ? (
        <ul className="divide-y divide-line">
          {events.map((event) => (
            <li
              key={event._id}
              className="flex flex-wrap items-start justify-between gap-3 py-4"
            >
              <div className="flex gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-soft text-sm font-semibold text-accent">
                  {new Date(event.startDatetime).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <div>
                  <h2 className="font-semibold">{event.name}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {new Date(event.startDatetime).toLocaleString()} –{' '}
                    {new Date(event.endDatetime).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                  {event.place && (
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                      <Icon name="pin" size={14} />
                      {event.place}
                    </p>
                  )}
                  {event.description && (
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {event.description}
                    </p>
                  )}
                </div>
              </div>
              <span className="rounded bg-paper px-2 py-1 text-xs text-muted">
                {event.type || 'Event'}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-4 text-sm text-muted">
          No events have been scheduled yet.
        </p>
      )}
    </div>
  )
}
