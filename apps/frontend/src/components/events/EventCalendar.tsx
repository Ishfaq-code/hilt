import { useEffect, useState } from 'react'
import { useAuthToken } from '../../hooks/useAuthToken'
import { api } from '../../lib/api'
import { hasAnyTag } from '../../lib/clubTags'
import { rsvpChangedEvent } from '../../lib/events'
import type { Organization } from '../../types'
import { ClubPreviewDialog } from '../organizations/ClubPreviewDialog'
import { TagPicker } from '../organizations/TagPicker'
import { inputClass, panelClass } from '../ui/styles'
import { CalendarMonth } from './CalendarMonth'
import { EventDialog } from './EventDialog'
import { dateKey, entriesByDay, eventKinds } from './calendarEntries'
import type { CalendarEntry } from './calendarEntries'

type Scope = 'discover' | 'mine'
type CalendarDialog = {
  entry: CalendarEntry
  view: 'event' | 'club'
}
type MonthResult = {
  month: Date
  token: string | null
  entries: CalendarEntry[]
  error?: string
}

const emptyFilters = { text: '', tags: [] as string[], type: '', club: '' }
const dayLabel = { weekday: 'long', month: 'short', day: 'numeric' } as const

function options(values: (string | undefined)[]) {
  return [
    ...new Set(values.filter((value): value is string => Boolean(value))),
  ].sort()
}

export function EventCalendar({
  scope,
  clubs = [],
}: {
  scope: Scope
  clubs?: Organization[]
}) {
  const token = useAuthToken()
  const [month, setMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [selected, setSelected] = useState('')
  const [opened, setOpened] = useState<CalendarDialog | null>(null)
  const [filters, setFilters] = useState(emptyFilters)
  const [onlyRsvps, setOnlyRsvps] = useState(false)
  const [result, setResult] = useState<MonthResult>()
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    function refresh() {
      setRevision((value) => value + 1)
    }
    window.addEventListener(rsvpChangedEvent, refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener(rsvpChangedEvent, refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  useEffect(() => {
    const request = new AbortController()
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 1)
    const params = new URLSearchParams({
      scope,
      start: month.toISOString(),
      end: end.toISOString(),
    })
    api<CalendarEntry[]>('/api/calendar?' + params, { signal: request.signal })
      .then((entries) => {
        if (!request.signal.aborted) setResult({ month, token, entries })
      })
      .catch((cause: unknown) => {
        if (!request.signal.aborted) {
          setResult({
            month,
            token,
            entries: [],
            error:
              cause instanceof Error ? cause.message : 'Couldn’t load events.',
          })
        }
      })
    return () => request.abort()
  }, [month, revision, scope, token])

  const current =
    result?.month === month && result.token === token ? result : undefined
  const entries = current?.entries ?? []
  const discover = scope === 'discover'
  const text = filters.text.trim().toLowerCase()

  const shown = entries.filter(({ club, event, kind }) => {
    if (!discover) return kind !== 'other' && (!onlyRsvps || kind === 'rsvp')
    const searchable = [event.name, event.place, club.name]
      .join(' ')
      .toLowerCase()
    return (
      hasAnyTag(club.tags, filters.tags) &&
      (!filters.type || event.type === filters.type) &&
      (!filters.club || club._id === filters.club) &&
      searchable.includes(text)
    )
  })

  const days = entriesByDay(shown)
  const today = dateKey(new Date())
  const firstDay = dateKey(month)
  const defaultDate = today.startsWith(firstDay.slice(0, 7)) ? today : firstDay
  const date =
    selected ||
    (days.has(today) ? today : (days.keys().next().value ?? defaultDate))
  const dayEvents = days.get(date) ?? []

  function moveMonth(step: number) {
    setMonth(new Date(month.getFullYear(), month.getMonth() + step, 1))
    setSelected('')
  }

  function updateFilter<Key extends keyof typeof emptyFilters>(
    key: Key,
    value: (typeof emptyFilters)[Key],
  ) {
    setFilters((previous) => ({ ...previous, [key]: value }))
  }

  function openEvent(entry: CalendarEntry) {
    setSelected(dateKey(new Date(entry.event.startDatetime)))
    setOpened({ entry, view: 'event' })
  }

  const hasFilters = Boolean(
    text || filters.tags.length || filters.type || filters.club || onlyRsvps,
  )
  const tags = clubs.flatMap((club) => club.tags)
  const types = options([
    ...entries.map(({ event }) => event.type),
    filters.type,
  ])

  return (
    <section
      aria-label={discover ? 'Upcoming events' : 'Your calendar'}
      className="min-w-0"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">
          {discover ? 'Upcoming events' : 'Your calendar'}
        </h2>
        {discover && hasFilters && (
          <button
            type="button"
            className="text-sm font-semibold text-accent hover:underline"
            onClick={() => setFilters(emptyFilters)}
          >
            Clear filters
          </button>
        )}
        {!discover && (
          <select
            aria-label="Calendar events"
            className={inputClass + ' sm:w-auto'}
            value={onlyRsvps ? 'rsvp' : 'all'}
            onChange={(change) => setOnlyRsvps(change.target.value === 'rsvp')}
          >
            <option value="all">Joined clubs & RSVPs</option>
            <option value="rsvp">My RSVPs</option>
          </select>
        )}
      </div>
      {discover && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,10rem))]">
          <input
            type="search"
            aria-label="Search events"
            placeholder="Search events"
            className={inputClass + ' col-span-2 sm:col-span-1'}
            value={filters.text}
            onChange={(change) => updateFilter('text', change.target.value)}
          />
          <TagPicker
            options={tags}
            selected={filters.tags}
            onChange={(tags) => updateFilter('tags', tags)}
          />
          <select
            aria-label="Event type"
            className={inputClass}
            value={filters.type}
            onChange={(change) => updateFilter('type', change.target.value)}
          >
            <option value="">All event types</option>
            {types.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <select
            aria-label="Hosting club"
            className={inputClass + ' col-span-2 sm:col-span-1'}
            value={filters.club}
            onChange={(change) => updateFilter('club', change.target.value)}
          >
            <option value="">All clubs</option>
            {[...clubs]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((club) => (
                <option key={club._id} value={club._id}>
                  {club.name}
                </option>
              ))}
          </select>
        </div>
      )}
      {current?.error && (
        <div
          role="alert"
          className="mb-3 flex flex-wrap gap-2 text-sm text-red-700"
        >
          <p>{current.error}</p>
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => setRevision((value) => value + 1)}
          >
            Try again
          </button>
        </div>
      )}
      {current && !current.error && hasFilters && !shown.length && (
        <p role="status" className="mb-3 text-sm text-muted">
          No events match those filters.
        </p>
      )}
      <div className="@container">
        <div className="grid min-w-0 items-start gap-4 @min-[36rem]:grid-cols-[minmax(0,1fr)_minmax(12rem,26%)]">
          <CalendarMonth
            month={month}
            selected={date}
            byDay={days}
            discover={discover}
            onMonth={moveMonth}
            onSelect={setSelected}
            onOpen={openEvent}
          />
          <section
            aria-label="Events on selected day"
            aria-busy={!current}
            className={panelClass + ' min-w-0'}
          >
            <h3
              aria-live="polite"
              className="border-b border-line px-4 py-3 text-sm font-semibold"
            >
              {new Date(date + 'T12:00:00').toLocaleDateString(
                undefined,
                dayLabel,
              )}
            </h3>
            {!current ? (
              <p className="px-4 py-4 text-sm text-muted">Loading events…</p>
            ) : dayEvents.length ? (
              <ul className="divide-y divide-line">
                {dayEvents.map((entry) => (
                  <li key={entry.club._id + ':' + entry.event._id}>
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      onClick={() => openEvent(entry)}
                      className="block w-full px-4 py-3 text-left hover:bg-paper"
                    >
                      <span
                        aria-hidden="true"
                        className={
                          'mr-2 inline-block size-2 rounded-full ' +
                          eventKinds[entry.kind].dot
                        }
                      />
                      <span className="text-sm font-semibold">
                        {entry.event.name}
                      </span>
                      <span className="mt-1 block text-xs text-muted">
                        {new Date(entry.event.startDatetime).toLocaleTimeString(
                          [],
                          { hour: 'numeric', minute: '2-digit' },
                        )}{' '}
                        · {entry.club.name}
                      </span>
                      {entry.event.private && (
                        <span className="mt-1 block text-xs font-medium text-muted">
                          Members only
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              !current.error && (
                <p className="px-4 py-4 text-sm text-muted">
                  No events on this day.
                </p>
              )
            )}
          </section>
        </div>
      </div>
      {opened?.view === 'event' && (
        <EventDialog
          club={opened.entry.club}
          event={opened.entry.event}
          onClose={() => setOpened(null)}
          onOpenClub={() => setOpened({ entry: opened.entry, view: 'club' })}
        />
      )}
      {opened?.view === 'club' && (
        <ClubPreviewDialog
          clubId={opened.entry.club._id}
          initialClub={
            clubs.find(({ _id }) => _id === opened.entry.club._id) ??
            opened.entry.club
          }
          onClose={() => setOpened(null)}
        />
      )}
    </section>
  )
}
