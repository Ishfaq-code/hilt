import type { Organization } from '../../types'
import type { ManagedEvent } from '../../types/management'
import { Icon } from '../ui/Icon'
import { EventBanner } from './EventBanner'
import { EventPreviewButton } from './EventPreviewButton'

export function OrganizationEventList({
  club,
  events,
  onOpenEvent,
}: {
  club: Pick<Organization, '_id' | 'name'>
  events: ManagedEvent[]
  onOpenEvent?: (event: ManagedEvent, trigger: HTMLButtonElement) => void
}) {
  return (
    <div className="py-5">
      {events.length ? (
        <ul className="divide-y divide-line">
          {events.map((event) => (
            <li
              key={event._id}
              className="flex flex-wrap items-start justify-between gap-3 py-4"
            >
              <div className="flex min-w-0 flex-1 gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-soft text-sm font-semibold text-accent">
                  {new Date(event.startDatetime).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <div className="min-w-0 wrap-anywhere">
                  <h2 className="font-semibold">
                    {onOpenEvent ? (
                      <button
                        type="button"
                        aria-haspopup="dialog"
                        data-event-id={event._id}
                        className="text-left hover:underline"
                        onClick={(click) =>
                          onOpenEvent(event, click.currentTarget)
                        }
                      >
                        {event.name}
                      </button>
                    ) : (
                      <EventPreviewButton
                        club={club}
                        event={event}
                        className="text-left hover:underline"
                      />
                    )}
                  </h2>
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
              {(event.banner || event.private) && (
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <EventBanner
                    src={event.banner}
                    className="h-12 w-18 rounded-md sm:h-18 sm:w-28"
                  />
                  {event.private && (
                    <span className="rounded bg-paper px-2 py-1 text-xs text-muted">
                      Members only
                    </span>
                  )}
                </div>
              )}
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
