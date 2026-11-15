import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { readAttendeeQr } from '../../lib/checkIn'
import type { CheckIn } from '../../lib/checkIn'
import { eventApi } from '../../lib/events'
import type { ManagedEvent } from '../../types/management'
import { Dialog } from '../ui/Dialog'
import { inputClass, secondaryClass } from '../ui/styles'
import { CheckInCodeDialog } from './CheckInCodeDialog'
import { ScannerDialog } from './ScannerDialog'

type Person = {
  _id: string
  firstName: string
  lastName: string
  email: string
  rsvped: boolean
  checkIn?: CheckIn | null
}

type Attendance = {
  rsvps: number
  people: Person[]
} & ({ tracked: false } | { tracked: true; withRsvp: number; walkIns: number })

const methods: Record<CheckIn['method'], string> = {
  self: 'Self check-in',
  'event-qr': 'Event QR',
  'staff-manual': 'Manual check-in',
  'attendee-qr': 'Attendee QR',
}

export function AttendanceDialog({
  clubId,
  event,
  onClose,
}: {
  clubId: string
  event: ManagedEvent
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [attendance, setAttendance] = useState<Attendance | null>(null)
  const [loadedQuery, setLoadedQuery] = useState('')
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const [tool, setTool] = useState<'event-qr' | 'scan' | null>(null)
  const endpoint = eventApi(clubId, event._id) + '/attendance'
  const search = query.trim()

  useEffect(() => {
    const request = new AbortController()
    let poll: number | undefined

    async function load() {
      try {
        const data = await api<Attendance>(
          endpoint + '?' + new URLSearchParams({ q: search }),
          {
            signal: request.signal,
          },
        )
        if (request.signal.aborted) return
        setAttendance(data)
        setLoadedQuery(search)
        setLoadError('')
      } catch (cause) {
        if (!request.signal.aborted) {
          setLoadError(
            cause instanceof Error
              ? cause.message
              : 'Couldn’t load attendance.',
          )
        }
      } finally {
        if (!request.signal.aborted)
          poll = window.setTimeout(() => void load(), 5000)
      }
    }

    poll = window.setTimeout(() => void load(), search ? 200 : 0)
    return () => {
      request.abort()
      window.clearTimeout(poll)
    }
  }, [endpoint, search, revision])

  function changed(message: string) {
    setNotice(message)
    setRevision((current) => current + 1)
  }

  async function update(person: Person) {
    setBusy(true)
    setActionError('')
    setNotice('')
    try {
      if (person.checkIn) {
        await api(endpoint + '/' + person._id, { method: 'DELETE' })
        changed('Check-in removed.')
      } else {
        await api(endpoint, {
          method: 'POST',
          body: JSON.stringify({ userId: person._id }),
        })
        changed('Checked in.')
      }
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : 'Couldn’t update attendance.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function scan(value: string) {
    await api(endpoint, {
      method: 'POST',
      body: JSON.stringify({ code: readAttendeeQr(value) }),
    })
    setTool(null)
    changed('Checked in.')
  }

  const people = loadedQuery === search ? attendance?.people : undefined

  return (
    <Dialog title="Attendance" onClose={onClose}>
      <div className="space-y-5">
        <div className="space-y-2">
          <h3 className="font-semibold">{event.name}</h3>
          {attendance && (
            <p className="text-sm text-muted">
              {attendance.rsvps} RSVPs
              {attendance.tracked
                ? ' · ' +
                  (attendance.withRsvp + attendance.walkIns) +
                  ' checked in (' +
                  attendance.withRsvp +
                  ' with RSVPs, ' +
                  attendance.walkIns +
                  ' walk-ins)'
                : ' · Attendance not tracked'}
            </p>
          )}
        </div>
        {attendance?.tracked && (
          <div className="flex flex-wrap gap-2">
            {event.attendance?.eventQr && (
              <button
                type="button"
                className={secondaryClass}
                aria-haspopup="dialog"
                onClick={() => setTool('event-qr')}
              >
                Show event QR
              </button>
            )}
            {event.attendance?.attendeeQr && (
              <button
                type="button"
                className={secondaryClass}
                aria-haspopup="dialog"
                onClick={() => setTool('scan')}
              >
                Scan QR
              </button>
            )}
          </div>
        )}
        <input
          type="search"
          aria-label="Find an attendee"
          placeholder="Find an attendee"
          className={inputClass}
          value={query}
          maxLength={80}
          onChange={(change) => setQuery(change.target.value)}
        />
        {loadError && (
          <p role="alert" className="text-sm text-red-700">
            {loadError}
          </p>
        )}
        {actionError && (
          <p role="alert" className="text-sm text-red-700">
            {actionError}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm text-active">
            {notice}
          </p>
        )}
        {!attendance && !loadError && (
          <p role="status" className="text-sm text-muted">
            Loading attendance…
          </p>
        )}
        {search.length === 1 && (
          <p className="text-sm text-muted">Enter at least two characters.</p>
        )}
        {search.length >= 2 && people?.length === 0 && (
          <p className="text-sm text-muted">No attendees match your search.</p>
        )}
        {people && people.length > 0 && (
          <ul className="divide-y divide-line border-t border-line">
            {people.map((person) => (
              <li
                key={person._id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div className="min-w-0 break-words">
                  <p className="text-sm font-semibold">
                    {person.firstName} {person.lastName}
                  </p>
                  <p className="text-xs text-muted">{person.email}</p>
                  <p className="mt-1 text-xs text-muted">
                    {person.checkIn
                      ? methods[person.checkIn.method] +
                        ' · ' +
                        new Date(person.checkIn.checkedInAt).toLocaleString()
                      : person.rsvped
                        ? 'RSVP’d'
                        : 'No RSVP'}
                  </p>
                </div>
                {(attendance?.tracked || person.checkIn) && (
                  <button
                    type="button"
                    className={secondaryClass}
                    disabled={
                      busy ||
                      (!person.checkIn &&
                        !person.rsvped &&
                        !event.attendance?.walkIns)
                    }
                    onClick={() => void update(person)}
                  >
                    {person.checkIn ? 'Undo check-in' : 'Check in'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {tool === 'event-qr' && (
        <CheckInCodeDialog
          target={{ clubId, eventId: event._id, name: event.name }}
          onClose={() => setTool(null)}
        />
      )}
      {tool === 'scan' && (
        <ScannerDialog onScan={scan} onClose={() => setTool(null)} />
      )}
    </Dialog>
  )
}
