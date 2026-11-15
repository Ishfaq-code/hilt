import type { SubmitEvent } from 'react'
import { useState } from 'react'
import { api } from '../../lib/api'
import { uploadBody } from '../../lib/uploads'
import { EventBanner } from './EventBanner'
import { ImageUpload } from '../ui/ImageUpload'
import type { EditableEvent } from '../../types/management'
import { TagPicker } from '../organizations/TagPicker'
import { buttonClass, inputClass, secondaryClass } from '../ui/styles'

const eventTagOptions = ['Workshop', 'Social', 'Meeting', 'Outdoors']

export function EventEditor({
  organizationId,
  event,
  onSaved,
  onCancel,
}: {
  organizationId: string
  event?: EditableEvent
  onSaved: (status: 'draft' | 'published') => Promise<void>
  onCancel?: () => void
}) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [removeBanner, setRemoveBanner] = useState(false)
  const [tags, setTags] = useState(event?.tags ?? [])
  const [trackAttendance, setTrackAttendance] = useState(
    event?.attendance?.enabled ?? false,
  )

  async function submit(formEvent: SubmitEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    setError('')
    setBusy(true)

    const submitter = formEvent.nativeEvent.submitter
    const status =
      submitter?.getAttribute('value') === 'draft' ? 'draft' : 'published'
    const data = new FormData(formEvent.currentTarget)
    const schedule = {
      date: String(data.get('date') ?? ''),
      startTime: String(data.get('startTime') ?? ''),
      endTime: String(data.get('endTime') ?? ''),
    }
    const start = new Date(schedule.date + 'T' + schedule.startTime)
    const end = new Date(schedule.date + 'T' + schedule.endTime)
    if (
      status === 'published' &&
      (!Number.isFinite(+start) || !Number.isFinite(+end) || end <= start)
    ) {
      setError('The end time must be after the start time.')
      setBusy(false)
      return
    }
    const payload = {
      name: String(data.get('name')).trim(),
      description: data.get('description'),
      status,
      ...(status === 'draft'
        ? { draftSchedule: schedule }
        : {
            startDatetime: start.toISOString(),
            endDatetime: end.toISOString(),
          }),
      place: data.get('place'),
      tags,
      private: data.get('visibility') === 'members',
      ...(removeBanner ? { banner: null } : {}),
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
        {
          method: event ? 'PATCH' : 'POST',
          body: uploadBody(payload, { banner: data.get('banner') }),
        },
      )
      await onSaved(status)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to save the event.',
      )
    } finally {
      setBusy(false)
    }
  }
  const draft = event?.status === 'draft' ? event.draftSchedule : undefined
  const localStart = event?.startDatetime
    ? new Date(event.startDatetime)
    : undefined
  const localEnd = event?.endDatetime ? new Date(event.endDatetime) : undefined
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
      <div className="space-y-2">
        <ImageUpload
          name="banner"
          label="Banner"
          optional
          onChange={(file) => {
            if (file) setRemoveBanner(false)
          }}
        />
        {event?.banner && (
          <>
            {!removeBanner && (
              <EventBanner
                src={event.banner}
                className="h-24 w-full rounded-md"
              />
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={removeBanner}
                onChange={(change) => {
                  if (change.target.checked) {
                    const banner =
                      change.target.form?.elements.namedItem('banner')
                    if (banner instanceof HTMLInputElement) banner.value = ''
                  }
                  setRemoveBanner(change.target.checked)
                }}
              />
              Remove current banner
            </label>
          </>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-medium">
          Date
          <input
            name="date"
            type="date"
            className={`${inputClass} mt-2`}
            defaultValue={draft?.date ?? date}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Start time
          <input
            name="startTime"
            type="time"
            className={`${inputClass} mt-2`}
            defaultValue={draft?.startTime ?? timeValue(localStart)}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          End time
          <input
            name="endTime"
            type="time"
            className={`${inputClass} mt-2`}
            defaultValue={draft?.endTime ?? timeValue(localEnd)}
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
          required={!event || event.status === 'draft'}
          placeholder="Building and room"
        />
      </label>
      <div className="grid items-start gap-4 sm:grid-cols-2">
        <TagPicker
          options={[...eventTagOptions, ...(event?.tags ?? [])]}
          selected={tags}
          onChange={setTags}
          showLabel
        />
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
          required={!event || event.status === 'draft'}
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
        {(!event || event.status === 'draft') && (
          <button
            type="submit"
            value="draft"
            formNoValidate
            className={secondaryClass}
            disabled={busy}
          >
            Save draft
          </button>
        )}
        <button
          type="submit"
          value="published"
          className={buttonClass}
          disabled={busy}
        >
          {busy
            ? 'Saving…'
            : event && event.status !== 'draft'
              ? 'Save'
              : 'Publish'}
        </button>
      </div>
    </form>
  )
}
