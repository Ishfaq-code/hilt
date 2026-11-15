import { useState } from 'react'
import type { Organization } from '../../types'
import type { ManagedEvent } from '../../types/management'
import { EventDialog } from './EventDialog'

export function EventPreviewButton({
  club,
  event,
  className,
  previewOnly,
}: {
  club: Pick<Organization, '_id' | 'name'>
  event: ManagedEvent
  className?: string
  previewOnly?: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className={className}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {event.name}
      </button>
      {open && (
        <EventDialog
          club={club}
          event={event}
          previewOnly={previewOnly}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
