import { useEffect, useState } from 'react'
import { useAuthPage } from '../../hooks/useAuthPage'
import { useAuthToken } from '../../hooks/useAuthToken'
import { useToast } from '../../hooks/useToast'
import { api } from '../../lib/api'
import { downloadEvent } from '../../lib/calendar'
import { checkIn, readEventQr } from '../../lib/checkIn'
import type { CheckIn } from '../../lib/checkIn'
import { eventApi, eventPath, rsvpChangedEvent } from '../../lib/events'
import type { Organization } from '../../types'
import type { ManagedEvent } from '../../types/management'
import { ReportDialog } from '../reports/ReportDialog'
import { Dialog } from '../ui/Dialog'
import { Icon } from '../ui/Icon'
import { buttonClass, secondaryClass, textActionClass } from '../ui/styles'
import { EventBanner } from './EventBanner'
import { RsvpButton } from './RsvpButton'
import { QrScanner } from './ScannerDialog'

type Participation = { rsvped: boolean; checkIn: CheckIn | null }

export function EventDialog({
  club,
  event,
  onClose,
  onOpenClub,
  previewOnly = false,
}: {
  club: Pick<Organization, '_id' | 'name'>
  event: ManagedEvent
  onClose: () => void
  onOpenClub: () => void
  previewOnly?: boolean
}) {
  const { toast } = useToast()
  const openLogin = useAuthPage()
  const token = useAuthToken()
  const [participation, setParticipation] = useState<Participation | null>(null)
  const [now, setNow] = useState(Date.now)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState<'report' | 'scan' | null>(null)

  const signedIn = Boolean(token)
  const endpoint = eventApi(club._id, event._id)
  const path = eventPath(club._id, event._id)
  const url = new URL(path, window.location.origin).href
  const start = new Date(event.startDatetime)
  const end = new Date(event.endDatetime)
  const hasStarted = now >= start.getTime()
  const canCheckIn = hasStarted && now < end.getTime()
  const startDate = start.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
  const startTime = start.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })

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
  }, [endpoint, previewOnly, signedIn, token, busy])

  async function share() {
    setError('')

    try {
      if (navigator.share) {
        await navigator.share(
          event.private ? { url } : { url, title: event.name },
        )
      } else {
        await navigator.clipboard.writeText(url)
        toast({ title: 'Link copied' })
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      setError('Couldn’t share this event.')
    }
  }

  async function rsvp(interested: boolean) {
    setBusy(true)
    setError('')
    try {
      const result = await api<{ rsvped: boolean }>(endpoint + '/rsvp', {
        method: 'PUT',
        body: JSON.stringify({ interested }),
      })
      setParticipation((current) => ({
        checkIn: current?.checkIn ?? null,
        rsvped: result.rsvped,
      }))
      window.dispatchEvent(new Event(rsvpChangedEvent))
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
    setDialog(null)
    toast({ title: 'Checked in' })
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
        <EventBanner
          src={event.banner}
          loading="eager"
          className="aspect-[3/1] w-full rounded-lg"
        />
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="cursor-pointer text-left text-sm font-semibold text-accent underline underline-offset-4 hover:text-ink"
                onClick={onOpenClub}
              >
                {club.name}
              </button>
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
          {event.description && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted">
              {event.description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1 basis-64 space-y-2 text-sm text-muted">
            <p className="flex items-start gap-2">
              <Icon name="calendar" />
              <time dateTime={event.startDatetime}>
                {startDate} @ {startTime}
              </time>
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
              {hasStarted ? (
                <button type="button" className={secondaryClass} disabled>
                  {participation?.rsvped && <Icon name="check" size={16} />}
                  {participation?.rsvped ? 'Going' : 'RSVP closed'}
                </button>
              ) : signedIn ? (
                <RsvpButton
                  going={Boolean(participation?.rsvped)}
                  disabled={busy || !participation}
                  onClick={() => void rsvp(!participation?.rsvped)}
                />
              ) : (
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => openLogin()}
                  className={buttonClass}
                >
                  Log in to RSVP
                </button>
              )}
            </div>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
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
              {event.attendance?.enabled && event.attendance.self && (
                <button
                  type="button"
                  className={buttonClass}
                  disabled={busy}
                  onClick={() => void selfCheckIn()}
                >
                  I am here
                </button>
              )}
              <button
                type="button"
                className={secondaryClass}
                aria-expanded={dialog === 'scan'}
                onClick={() => setDialog(dialog === 'scan' ? null : 'scan')}
              >
                Scan QR
              </button>
            </div>
          )}
        {dialog === 'scan' && canCheckIn && <QrScanner inline onScan={scan} />}
        {!previewOnly && (
          <div className="flex flex-wrap justify-end gap-x-4 border-t border-line pt-3">
            <button
              type="button"
              className={textActionClass}
              onClick={() => downloadEvent(event, url)}
            >
              Add to calendar
            </button>
            <button
              type="button"
              className={textActionClass}
              aria-haspopup="dialog"
              onClick={() => setDialog('report')}
            >
              Report
            </button>
          </div>
        )}
      </div>
      {dialog === 'report' && (
        <ReportDialog
          endpoint={endpoint + '/reports'}
          onClose={() => setDialog(null)}
        />
      )}
    </Dialog>
  )
}
