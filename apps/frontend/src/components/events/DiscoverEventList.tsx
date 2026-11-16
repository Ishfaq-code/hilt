import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import type { Organization } from '../../types'
import type { ManagedEvent } from '../../types/management'
import { ClubPreviewDialog } from '../organizations/ClubPreviewDialog'
import { TagPicker } from '../organizations/TagPicker'
import { inputClass, panelClass, secondaryClass } from '../ui/styles'
import { EventBanner } from './EventBanner'
import { EventDialog } from './EventDialog'

type Entry = {
  club: Pick<Organization, '_id' | 'name' | 'tags'>
  event: ManagedEvent
  kind: 'other' | 'joined' | 'rsvp'
}

type Result = {
  entries: Entry[]
  page: number
  hasNext: boolean
  eventTags: string[]
}
const emptyFilters = {
  text: '',
  clubTags: [] as string[],
  eventTags: [] as string[],
  club: '',
}

export function DiscoverEventList({ clubs }: { clubs: Organization[] }) {
  const [filters, setFilters] = useState(emptyFilters)
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<{ key: string; data: Result }>()
  const [error, setError] = useState('')
  const [errorKey, setErrorKey] = useState('')
  const [revision, setRevision] = useState(0)
  const [opened, setOpened] = useState<{
    entry: Entry
    view: 'event' | 'club'
  } | null>(null)

  useEffect(() => {
    const request = new AbortController()
    const params = new URLSearchParams({
      scope: 'discover',
      page: String(page),
    })
    if (filters.text.trim()) params.set('search', filters.text.trim())
    if (filters.club) params.set('club', filters.club)
    filters.clubTags.forEach((tag) => params.append('clubTag', tag))
    filters.eventTags.forEach((tag) => params.append('eventTag', tag))
    const query = params.toString()
    const key = query + ':' + revision
    api<Result>('/api/calendar?' + query, { signal: request.signal })
      .then((data) => {
        if (!request.signal.aborted) {
          setResult({ key, data })
          setErrorKey('')
        }
      })
      .catch((cause: unknown) => {
        if (!request.signal.aborted) {
          setError(
            cause instanceof Error ? cause.message : 'Couldn’t load events.',
          )
          setErrorKey(key)
        }
      })
    return () => request.abort()
  }, [filters, page, revision])

  function updateFilter<Key extends keyof typeof emptyFilters>(
    key: Key,
    value: (typeof emptyFilters)[Key],
  ) {
    setFilters((previous) => ({ ...previous, [key]: value }))
    setPage(1)
  }

  const clubTags = [...new Set(clubs.flatMap((club) => club.tags))]
  const params = new URLSearchParams({ scope: 'discover', page: String(page) })
  if (filters.text.trim()) params.set('search', filters.text.trim())
  if (filters.club) params.set('club', filters.club)
  filters.clubTags.forEach((tag) => params.append('clubTag', tag))
  filters.eventTags.forEach((tag) => params.append('eventTag', tag))
  const queryKey = params.toString() + ':' + revision
  const currentResult = result?.key === queryKey ? result.data : undefined
  const loading = !currentResult && errorKey !== queryKey
  const currentError = errorKey === queryKey ? error : ''
  const eventTags = currentResult?.eventTags ?? []

  return (
    <section aria-label="Upcoming events" className="mt-10 min-w-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">
          Upcoming events
        </h2>
        {(filters.text ||
          filters.clubTags.length ||
          filters.eventTags.length ||
          filters.club) && (
          <button
            type="button"
            className="text-sm font-semibold text-accent hover:underline"
            onClick={() => {
              setFilters(emptyFilters)
              setPage(1)
            }}
          >
            Clear filters
          </button>
        )}
      </div>
      <div className="mb-4 grid grid-cols-2 items-start gap-2 sm:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,10rem))]">
        <input
          type="search"
          aria-label="Search events"
          placeholder="Search events"
          className={inputClass + ' col-span-2 sm:col-span-1'}
          value={filters.text}
          onChange={(change) => updateFilter('text', change.target.value)}
        />
        <TagPicker
          label="Club tags"
          options={clubTags}
          selected={filters.clubTags}
          onChange={(tags) => updateFilter('clubTags', tags)}
        />
        <TagPicker
          label="Event tags"
          options={eventTags}
          selected={filters.eventTags}
          onChange={(tags) => updateFilter('eventTags', tags)}
        />
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

      {currentError && (
        <div
          role="alert"
          className="mb-3 flex flex-wrap gap-2 text-sm text-red-700"
        >
          <p>{currentError}</p>
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => setRevision((current) => current + 1)}
          >
            Try again
          </button>
        </div>
      )}
      {loading && (
        <p role="status" className="py-5 text-sm text-muted">
          Loading events…
        </p>
      )}
      {!loading && !currentError && !currentResult?.entries.length && (
        <p role="status" className="py-5 text-sm text-muted">
          No events match those filters.
        </p>
      )}
      {!loading && !currentError && currentResult?.entries.length ? (
        <ul aria-busy={loading} className="space-y-4">
          {currentResult.entries.map((entry) => {
            const start = new Date(entry.event.startDatetime)
            return (
              <li key={entry.club._id + ':' + entry.event._id}>
                <article className={panelClass + ' overflow-hidden'}>
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={() => setOpened({ entry, view: 'event' })}
                    className="block w-full text-left"
                  >
                    <EventBanner
                      src={entry.event.banner}
                      className="aspect-[3/1] w-full"
                    />
                    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                      <div className="min-w-0">
                        <h3 className="text-xl font-bold tracking-tight sm:text-2xl">
                          {entry.event.name}
                        </h3>
                        {entry.event.place && (
                          <p className="mt-1 text-sm font-bold text-ink sm:text-base">
                            {entry.event.place}
                          </p>
                        )}
                        {entry.event.description && (
                          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">
                            {entry.event.description}
                          </p>
                        )}
                        <p className="mt-3 text-xs font-medium text-muted">
                          Hosted by {entry.club.name}
                        </p>
                      </div>
                      <time
                        dateTime={entry.event.startDatetime}
                        className="shrink-0 text-sm font-bold text-ink sm:min-w-40 sm:text-right sm:text-base"
                      >
                        {start.toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                        <span className="mt-1 block">
                          {start.toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </time>
                    </div>
                  </button>
                </article>
              </li>
            )
          })}
        </ul>
      ) : null}
      <nav
        aria-label="Event pages"
        className="mt-5 flex items-center justify-between"
      >
        <button
          type="button"
          className={secondaryClass}
          disabled={page <= 1 || loading}
          onClick={() => setPage((current) => current - 1)}
        >
          Previous
        </button>
        <span className="text-sm text-muted">Page {page}</span>
        <button
          type="button"
          className={secondaryClass}
          disabled={!currentResult?.hasNext || loading}
          onClick={() => setPage((current) => current + 1)}
        >
          Next
        </button>
      </nav>

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
