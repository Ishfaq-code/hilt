import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { eventApi } from '../../lib/events'
import type { Organization } from '../../types'
import type { ManagedEvent } from '../../types/management'
import { Dialog } from '../ui/Dialog'
import { buttonClass } from '../ui/styles'
import { EventDialog } from './EventDialog'

type Result = { event: ManagedEvent } | { membersOnly: true }

export function SharedEventDialog({
  club,
  eventId,
  join,
  busy,
  message,
  onClose,
  onOpenClub,
}: {
  club: Organization
  eventId: string
  join: () => void
  busy: boolean
  message: string
  onClose: () => void
  onOpenClub: () => void
}) {
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const endpoint = eventApi(club._id, eventId)
  const localEvent = club.events?.find((event) => event._id === eventId)

  useEffect(() => {
    if (localEvent) return
    const request = new AbortController()
    api<Result>(endpoint, { signal: request.signal })
      .then((response) => {
        if (!request.signal.aborted) setResult(response)
      })
      .catch((cause: unknown) => {
        if (!request.signal.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Couldn’t load this event.',
          )
        }
      })
    return () => request.abort()
  }, [endpoint, localEvent])

  const event =
    localEvent ?? (result && 'event' in result ? result.event : null)
  if (event) {
    return (
      <EventDialog
        club={club}
        event={event}
        onClose={onClose}
        onOpenClub={onOpenClub}
      />
    )
  }

  if (result && 'membersOnly' in result) {
    return (
      <Dialog title="Members only" onClose={onClose}>
        <p className="text-sm text-muted">
          Join{' '}
          <button
            type="button"
            className="cursor-pointer font-medium text-accent underline underline-offset-4 hover:text-ink"
            onClick={onOpenClub}
          >
            {club.name}
          </button>{' '}
          to see this event.
        </p>
        {message && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {message}
          </p>
        )}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className={buttonClass}
            disabled={busy}
            onClick={join}
          >
            {busy ? 'Joining…' : 'Join to view event'}
          </button>
        </div>
      </Dialog>
    )
  }

  return (
    <Dialog title="Event" onClose={onClose}>
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <p role="status">Loading event…</p>
      )}
    </Dialog>
  )
}
