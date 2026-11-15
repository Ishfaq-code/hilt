import type { SubmitEvent } from 'react'
import { useState } from 'react'
import { api } from '../../lib/api'
import type { ManagedEvent } from '../../types/management'
import { buttonClass, inputClass, secondaryClass } from '../ui/styles'

export function EventEditor({
  organizationId,
  event,
  onSaved,
  onCancel,
}: {
  organizationId: string
  event?: ManagedEvent
  onSaved: () => Promise<void>
  onCancel?: () => void
}) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [trackAttendance, setTrackAttendance] = useState(
    event?.attendance?.enabled ?? false,
  )

  async function submit(formEvent: SubmitEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    setError('')
    setBusy(true)

    const data = new FormData(formEvent.currentTarget)
    const start = new Date(`${data.get('date')}T${data.get('startTime')}`)
    const end = new Date(`${data.get('date')}T${data.get('endTime')}`)
    if (end <= start) {
      setError('The end time must be after the start time.')
      setBusy(false)
      return
    }
    const payload = {
      name: String(data.get('name')).trim(),
      description: data.get('description'),
      startDatetime: start.toISOString(),
      endDatetime: end.toISOString(),
      place: data.get('place'),
      type: data.get('type'),
      private: data.get('visibility') === 'members',
      banner: data.get('banner') || null,
      attendance: {
        enabled: trackAttendance,
        self: data.has('self'),
        eventQr: data.has('eventQr'),
        attendeeQr: data.has('attendeeQr'),
        walkIns: data.has('walkIns'),
      },
    }
    try {
      await api(
        `/api/organizations/${organizationId}/events${event ? `/${event._id}` : ''}`,
        { method: event ? 'PATCH' : 'POST', body: JSON.stringify(payload) },
      )
      await onSaved()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to save the event.',
      )
    } finally {
      setBusy(false)
    }
  }
  const localStart = event ? new Date(event.startDatetime) : undefined
  const localEnd = event ? new Date(event.endDatetime) : undefined
  const date = localStart
    ? `${localStart.getFullYear()}-${String(localStart.getMonth() + 1).padStart(2, '0')}-${String(localStart.getDate()).padStart(2, '0')}`
    : ''
  const timeValue = (value?: Date) =>
    value
      ? `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
      : ''

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <label className="block text-sm font-medium">
        Title
        <input
          name="name"
          className={`${inputClass} mt-2`}
          defaultValue={event?.name}
          required
        />
      </label>
      <label className="block text-sm font-medium">
        Banner <span className="font-normal text-muted">(optional)</span>
        <input
          name="banner"
          type="url"
          className={`${inputClass} mt-2`}
          defaultValue={event?.banner || ''}
          placeholder="https://"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-medium">
          Date
          <input
            name="date"
            type="date"
            className={`${inputClass} mt-2`}
            defaultValue={date}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Start time
          <input
            name="startTime"
            type="time"
            className={`${inputClass} mt-2`}
            defaultValue={timeValue(localStart) || '18:00'}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          End time
          <input
            name="endTime"
            type="time"
            className={`${inputClass} mt-2`}
            defaultValue={timeValue(localEnd) || '19:00'}
            required
          />
        </label>
      </div>
      <label className="block text-sm font-medium">
        Location
        <input
          name="place"
          className={`${inputClass} mt-2`}
          defaultValue={event?.place || ''}
          placeholder="Building and room"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Event type
          <select
            name="type"
            className={`${inputClass} mt-2`}
            defaultValue={event?.type || 'Workshop'}
          >
            <option>Workshop</option>
            <option>Social</option>
            <option>Meeting</option>
            <option>Outdoors</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          Visibility
          <select
            name="visibility"
            className={`${inputClass} mt-2`}
            defaultValue={event?.private ? 'members' : 'public'}
          >
            <option value="public">Public</option>
            <option value="members">Members only</option>
          </select>
        </label>
      </div>
      <label className="block text-sm font-medium">
        Description
        <textarea
          name="description"
          className={`${inputClass} mt-2`}
          rows={4}
          defaultValue={event?.description || ''}
        />
      </label>
      <fieldset className="space-y-2 border-t border-line pt-4">
        <legend className="pr-2 text-sm font-semibold">Attendance</legend>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={trackAttendance}
            onChange={(change) => setTrackAttendance(change.target.checked)}
          />
          Track attendance
        </label>
        <div hidden={!trackAttendance} className="space-y-2 pl-5">
          {(
            [
              ['self', 'I am here'],
              ['eventQr', 'Event QR'],
              ['attendeeQr', 'Attendee QR'],
              ['walkIns', 'Allow walk-ins'],
            ] as const
          ).map(([name, label]) => (
            <label key={name} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={name}
                defaultChecked={event?.attendance?.[name]}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" className={secondaryClass} onClick={onCancel}>
          Cancel
        </button>
        <button className={buttonClass} disabled={busy}>
          {busy ? 'Saving…' : event ? 'Save' : 'Publish'}
        </button>
      </div>
    </form>
  )
}
