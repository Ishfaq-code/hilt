import { useId, useRef } from 'react'
import type { Organization } from '../../types'
import type { EditableEvent } from '../../types/management'
import { EventPreviewButton } from '../events/EventPreviewButton'
import { Icon } from '../ui/Icon'
import { buttonClass, panelClass, secondaryClass } from '../ui/styles'

const dateFormat = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})
const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})
const iconButtonClass =
  'grid size-10 place-items-center rounded-lg text-muted hover:bg-paper hover:text-ink'

export function ManagedEventRow({
  club,
  event,
  live,
  showDraftStatus,
  totals,
  onOpenClub,
  onEdit,
  onAttendance,
  onDelete,
}: {
  club: Pick<Organization, '_id' | 'name'>
  event: EditableEvent
  live: boolean
  showDraftStatus: boolean
  totals?: { rsvpCount: number; attendance: number }
  onOpenClub: () => void
  onEdit?: () => void
  onAttendance?: () => void
  onDelete?: () => void
}) {
  const menuId = useId()
  const menu = useRef<HTMLDivElement>(null)
  const draft = event.status === 'draft'
  const name = event.name || 'Untitled event'
  const start = eventStart(event)

  return (
    <li className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 px-4 py-3 @min-[37rem]:grid-cols-[6rem_minmax(0,1fr)_auto]">
      <div className="self-start pt-0.5 text-sm">
        {start ? (
          <time dateTime={start.toISOString()}>
            <span className="block font-medium">
              {dateFormat.format(start)}
            </span>
            <span className="block text-muted">{timeFormat.format(start)}</span>
          </time>
        ) : (
          <span className="text-muted">Unscheduled</span>
        )}
      </div>

      <div className="min-w-0 wrap-anywhere">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h2 className="font-semibold">
            {draft && onEdit ? (
              <button
                type="button"
                aria-haspopup="dialog"
                className="text-left hover:underline"
                onClick={onEdit}
              >
                {name}
              </button>
            ) : draft ? (
              name
            ) : (
              <EventPreviewButton
                club={club}
                event={event}
                previewOnly
                onOpenClub={onOpenClub}
                className="text-left hover:underline"
              />
            )}
          </h2>
          {live && (
            <span className="text-xs font-medium text-active">In progress</span>
          )}
          {draft && showDraftStatus && (
            <span className="text-xs text-accent">Draft</span>
          )}
          {event.private && (
            <span className="text-xs text-muted">Members only</span>
          )}
        </div>
        {event.place && <p className="text-sm text-muted">{event.place}</p>}
        {totals && (
          <p className="mt-0.5 text-xs text-muted">
            {totals.rsvpCount} going · {totals.attendance} checked in
          </p>
        )}
      </div>

      {(onAttendance || onEdit || onDelete) && (
        <div className="col-span-full flex flex-wrap items-center justify-end gap-1 @min-[37rem]:col-span-1">
          {onAttendance && (
            <button
              type="button"
              className={live ? buttonClass : secondaryClass}
              aria-haspopup="dialog"
              onClick={onAttendance}
            >
              <Icon name="people" size={17} />
              Attendance
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              className={iconButtonClass}
              aria-label="Edit"
              title="Edit"
              aria-haspopup="dialog"
              onClick={onEdit}
            >
              <Icon name="edit" size={17} />
            </button>
          )}
          {onDelete && (
            <>
              <button
                type="button"
                className={iconButtonClass}
                aria-label={`More actions for ${name}`}
                title="More actions"
                popoverTarget={menuId}
              >
                <span aria-hidden="true" className="text-xl leading-none">
                  ⋯
                </span>
              </button>
              <div
                ref={menu}
                id={menuId}
                popover="auto"
                className={`${panelClass} inset-auto m-0 mt-1 p-1 shadow-md [position-area:bottom_span-left] [position-try-fallbacks:flip-block]`}
              >
                <button
                  type="button"
                  className="block min-h-10 rounded-md px-4 text-sm text-red-700 hover:bg-paper"
                  onClick={() => {
                    menu.current?.hidePopover()
                    onDelete()
                  }}
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </li>
  )
}

function eventStart(event: EditableEvent) {
  const draft = event.status === 'draft' ? event.draftSchedule : undefined
  const value =
    event.startDatetime ||
    (draft?.date && draft.startTime && `${draft.date}T${draft.startTime}`)
  if (!value) return null
  const start = new Date(value)
  return Number.isFinite(start.getTime()) ? start : null
}
