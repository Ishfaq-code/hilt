import { useSearchParams } from 'react-router-dom'
import { DiscoverEventCard } from '../components/events/DiscoverEventCard'
import { EventFilters } from '../components/events/EventFilters'
import { ClubPreviewFromUrl } from '../components/organizations/ClubPreviewFromUrl'
import { useClubDirectory } from '../hooks/useClubDirectory'
import { useEventDirectory } from '../hooks/useEventDirectory'
import { eventDirectoryQuery } from '../lib/eventFilters'

export default function EventsPage() {
  const [filters, setFilters] = useSearchParams()
  const { clubs } = useClubDirectory()
  const query = eventDirectoryQuery(filters)
  const { entries, eventTags, loading, error, nextPage, hasNext, retry } =
    useEventDirectory(query, 10)

  function updateFilters(updates: Record<string, string | string[]>) {
    const next = new URLSearchParams(filters)
    for (const [key, value] of Object.entries(updates)) {
      next.delete(key)
      const values = Array.isArray(value) ? value : [value]
      values.filter(Boolean).forEach((item) => next.append(key, item))
    }
    setFilters(next, { replace: true })
  }

  return (
    <section className="mx-auto max-w-6xl px-4 pt-9 sm:px-8 sm:pt-13">
      <h1 className="text-4xl font-semibold tracking-tight">Events</h1>
      <EventFilters
        filters={filters}
        eventTags={eventTags}
        onChange={updateFilters}
      />

      <ul
        aria-label="Events"
        aria-busy={loading}
        className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {entries.map((entry) => (
          <li key={entry.club._id + ':' + entry.event._id}>
            <DiscoverEventCard entry={entry} layout="card" />
          </li>
        ))}
      </ul>
      {hasNext && !error && (
        <div ref={nextPage} className="h-px" aria-hidden="true" />
      )}
      {loading && (
        <p role="status" className="py-5 text-sm text-muted">
          Loading events…
        </p>
      )}
      {error && (
        <div role="alert" className="space-y-2 py-5 text-sm text-red-700">
          <p>{error}</p>
          <button
            type="button"
            className="font-semibold underline"
            onClick={retry}
          >
            Try again
          </button>
        </div>
      )}
      {!loading && !error && !entries.length && (
        <p role="status" className="py-5 text-sm text-muted">
          No events match those filters.
        </p>
      )}
      <ClubPreviewFromUrl clubs={clubs} />
    </section>
  )
}
