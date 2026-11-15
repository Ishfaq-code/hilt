import { useState } from 'react'
import type { OrganizationManagement } from '../../hooks/useOrganizationManagement'
import type { Organization } from '../../types'
import type { EditableEvent, ManagedEvent } from '../../types/management'
import { AttendanceDialog } from '../events/AttendanceDialog'
import { EventEditor } from '../events/EventEditor'
import { EventPreviewButton } from '../events/EventPreviewButton'
import { Dialog } from '../ui/Dialog'
import { Icon } from '../ui/Icon'
import { buttonClass, panelClass, secondaryClass } from '../ui/styles'

type Props = Pick<
  OrganizationManagement,
  'events' | 'saved' | 'deleteEvent'
> & {
  club: Pick<Organization, '_id' | 'name'>
  canEdit: boolean
  canCheckIn: boolean
}

type EventAction =
  | { kind: 'new' }
  | { kind: 'edit'; event: EditableEvent }
  | { kind: 'attendance'; event: ManagedEvent }

export function OrganizationEvents({
  club,
  events,
  canEdit,
  canCheckIn,
  saved,
  deleteEvent,
}: Props) {
  const [action, setAction] = useState<EventAction | null>(null)
  const close = () => setAction(null)
  const rowButton = secondaryClass + ' size-10 p-0!'

  async function save(message: string) {
    close()
    await saved(message)
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Events</h1>
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
      {events.length ? (
        <ul className={panelClass + ' mt-4 divide-y divide-line'}>
          {events.map((event) => (
            <li
              key={event._id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">
                    {event.status === 'draft' ? (
                      <button
                        type="button"
                        className="text-left hover:underline"
                        onClick={() => setAction({ kind: 'edit', event })}
                      >
                        {event.name || 'Untitled event'}
                      </button>
                    ) : (
                      <EventPreviewButton
                        club={club}
                        event={event}
                        previewOnly
                        className="text-left hover:underline"
                      />
                    )}
                  </h2>
                  {event.status === 'draft' && (
                    <span className="rounded bg-soft px-2 py-0.5 text-xs font-semibold text-accent">
                      Draft
                    </span>
                  )}
                  {event.private && (
                    <span className="rounded bg-paper px-2 py-0.5 text-xs font-semibold text-muted">
                      Members only
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted">
                  {event.startDatetime &&
                    new Date(event.startDatetime).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  {event.place && ' · ' + event.place}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canCheckIn && event.status !== 'draft' && (
                  <button
                    type="button"
                    className={rowButton}
                    aria-label="Attendance"
                    title="Attendance"
                    aria-haspopup="dialog"
                    onClick={() => setAction({ kind: 'attendance', event })}
                  >
                    <Icon name="people" size={17} />
                  </button>
                )}
                {canEdit && (
                  <>
                    <button
                      type="button"
                      className={rowButton}
                      aria-label="Edit"
                      title="Edit"
                      aria-haspopup="dialog"
                      onClick={() => setAction({ kind: 'edit', event })}
                    >
                      <Icon name="edit" size={17} />
                    </button>
                    <button
                      type="button"
                      className={secondaryClass + ' text-red-700'}
                      onClick={() => void deleteEvent(event)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className={panelClass + ' mt-4 p-4 text-sm text-muted'}>
          No events yet.
        </p>
      )}
      {action?.kind === 'attendance' && (
        <AttendanceDialog club={club} event={action.event} onClose={close} />
      )}
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
