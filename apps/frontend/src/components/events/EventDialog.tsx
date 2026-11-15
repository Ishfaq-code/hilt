import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { downloadEvent } from '../../lib/calendar'
import { checkIn, readEventQr } from '../../lib/checkIn'
import type { CheckIn } from '../../lib/checkIn'
import { eventApi, eventPath } from '../../lib/events'
import type { Organization } from '../../types'
import type { ManagedEvent } from '../../types/management'
import { Dialog } from '../ui/Dialog'
import { Icon } from '../ui/Icon'
import { buttonClass, secondaryClass } from '../ui/styles'
import { CheckInConfirmation } from './CheckInConfirmation'
import { ScannerDialog } from './ScannerDialog'

type Participation = { rsvped: boolean; checkIn: CheckIn | null }

export function EventDialog({
  club,
  event,
  onClose,
  previewOnly = false,
}: {
  club: Pick<Organization, '_id' | 'name'>
  event: ManagedEvent
  onClose: () => void
  previewOnly?: boolean
}) {
  const [participation, setParticipation] = useState<Participation | null>(null)
  const [now, setNow] = useState(Date.now)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [dialog, setDialog] = useState<
    'calendar' | 'scan' | 'checked-in' | null
  >(null)

  const signedIn = Boolean(sessionStorage.getItem('authToken'))
  const endpoint = eventApi(club._id, event._id)
  const path = eventPath(club._id, event._id)
  const url = new URL(path, window.location.origin).href
  const start = new Date(event.startDatetime)
  const end = new Date(event.endDatetime)
  const hasStarted = now >= start.getTime()
  const canCheckIn =
    hasStarted && now < end.getTime() && event.attendance?.enabled
  const sameDay = start.toDateString() === end.toDateString()
  const time = {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  } as const
  const date = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  } as const

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (previewOnly || !signedIn || busy) return

    const request = new AbortController()
    let poll: number | undefined

    async function load() {
      try {
        const data = await api<Participation>(endpoint + '/participation', {
          signal: request.signal,
        })
        if (!request.signal.aborted) setParticipation(data)
      } catch (cause) {
        if (!request.signal.aborted) {
          setError(
            cause instanceof Error ? cause.message : 'Couldn’t load your RSVP.',
          )
        }
      } finally {
        if (!request.signal.aborted)
          poll = window.setTimeout(() => void load(), 5000)
      }
    }

    void load()
    return () => {
      request.abort()
      window.clearTimeout(poll)
    }
  }, [endpoint, previewOnly, signedIn, busy])

  async function share() {
    setError('')
    setNotice('')

    try {
      if (navigator.share) {
        await navigator.share(
          event.private ? { url } : { url, title: event.name },
        )
      } else {
        await navigator.clipboard.writeText(url)
        setNotice('Link copied.')
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      setError('Couldn’t share this event.')
    }
  }

  async function rsvp(interested: boolean) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await api<{ rsvped: boolean }>(endpoint + '/rsvp', {
        method: 'PUT',
        body: JSON.stringify({ interested }),
      })
      setParticipation((current) => ({
        checkIn: current?.checkIn ?? null,
        rsvped: result.rsvped,
      }))
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Couldn’t update your RSVP.',
      )
    } finally {
      setBusy(false)
    }
  }

  function confirmCheckIn(record: CheckIn) {
    setParticipation((current) => ({
      rsvped: current?.rsvped ?? false,
      checkIn: record,
    }))
    setDialog('checked-in')
  }

  async function selfCheckIn() {
    setBusy(true)
    setError('')
    try {
      confirmCheckIn(await checkIn(club._id, event._id))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Couldn’t check in.')
    } finally {
      setBusy(false)
    }
  }

  async function scan(value: string) {
    const qr = readEventQr(value)
    if (qr.clubId !== club._id || qr.eventId !== event._id) {
      throw new Error('Scan the QR code for this event.')
    }
    confirmCheckIn(await checkIn(qr.clubId, qr.eventId, qr.code))
  }

  return (
    <Dialog title={event.name} onClose={onClose}>
      <div className="space-y-5">
        {event.banner && (
          <img
            src={event.banner}
            alt=""
            className="aspect-[3/1] w-full rounded-lg object-cover"
          />
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-accent">{club.name}</p>
            {event.private && (
              <span className="rounded bg-paper px-2 py-0.5 text-xs font-semibold text-muted">
                Members only
              </span>
            )}
          </div>
          {!previewOnly && (
            <button
              type="button"
              aria-label="Share event"
              title="Share event"
              className={secondaryClass + ' size-10 p-0!'}
              onClick={() => void share()}
            >
              <Icon name="share" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1 basis-64 space-y-2 text-sm text-muted">
            <p className="flex items-start gap-2">
              <Icon name="calendar" />
              <span>
                {start.toLocaleDateString(undefined, date)} ·{' '}
                {start.toLocaleTimeString(undefined, time)} –{' '}
                {!sameDay && end.toLocaleDateString(undefined, date) + ' · '}
                {end.toLocaleTimeString(undefined, time)}
              </span>
            </p>
            {event.place && (
              <p className="flex items-start gap-2">
                <Icon name="pin" />
                <span>{event.place}</span>
              </p>
            )}
          </div>
          {!previewOnly && (
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              {participation?.rsvped && (
                <span
                  role="status"
                  className="text-sm font-semibold text-active"
                >
                  Going
                </span>
              )}
              {hasStarted ? (
                !participation?.rsvped && (
                  <button type="button" className={secondaryClass} disabled>
                    RSVP closed
                  </button>
                )
              ) : signedIn ? (
                <button
                  type="button"
                  className={
                    participation?.rsvped ? secondaryClass : buttonClass
                  }
                  disabled={busy || !participation}
                  onClick={() => void rsvp(!participation?.rsvped)}
                >
                  {participation?.rsvped ? 'Cancel RSVP' : 'RSVP'}
                </button>
              ) : (
                <Link
                  to="/login"
                  state={{ from: path }}
                  className={buttonClass}
                >
                  Log in to RSVP
                </Link>
              )}
            </div>
          )}
        </div>
        {event.description && (
          <div className="border-t border-line pt-4">
            <h3 className="font-semibold">About the event</h3>
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-muted">
              {event.description}
            </p>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm text-active">
            {notice}
          </p>
        )}
        {!previewOnly && participation?.checkIn && (
          <p role="status" className="text-sm font-semibold text-active">
            Checked in
          </p>
        )}
        {!previewOnly &&
          canCheckIn &&
          signedIn &&
          participation &&
          !participation.checkIn &&
          (participation.rsvped || event.attendance?.walkIns) && (
            <div className="flex flex-wrap gap-2">
              {event.attendance?.self && (
                <button
                  type="button"
                  className={buttonClass}
                  disabled={busy}
                  onClick={() => void selfCheckIn()}
                >
                  I am here
                </button>
              )}
              {event.attendance?.eventQr && (
                <button
                  type="button"
                  className={secondaryClass}
                  aria-haspopup="dialog"
                  onClick={() => setDialog('scan')}
                >
                  Scan QR
                </button>
              )}
            </div>
          )}
        {!previewOnly && (
          <div className="flex justify-end border-t border-line pt-4">
            <button
              type="button"
              className={secondaryClass}
              aria-haspopup="dialog"
              onClick={() => setDialog('calendar')}
            >
              Add to calendar
            </button>
          </div>
        )}
      </div>
      {dialog === 'calendar' && (
        <Dialog title="Add to calendar" onClose={() => setDialog(null)}>
          <button
            type="button"
            className={buttonClass}
            onClick={() => downloadEvent(event, url)}
          >
            Download calendar file
          </button>
        </Dialog>
      )}
      {dialog === 'scan' && (
        <ScannerDialog onScan={scan} onClose={() => setDialog(null)} />
      )}
      {dialog === 'checked-in' && (
        <CheckInConfirmation onClose={() => setDialog(null)} />
      )}
    </Dialog>
  )
}
