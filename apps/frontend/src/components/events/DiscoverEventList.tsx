import { useEventDirectory } from '../../hooks/useEventDirectory'
import { HorizontalCardRow } from '../ui/HorizontalCardRow'
import { DiscoverEventCard } from './DiscoverEventCard'

export function DiscoverEventList({
  title = 'Popular',
  category,
}: {
  title?: string
  category?: string
}) {
  const query = new URLSearchParams({ sort: 'popular' })
  if (category) query.set('eventCategory', category)
  const directory = useEventDirectory(query.toString(), 5)

  return (
    <HorizontalCardRow title={title}>
      {directory.entries.map((entry) => (
        <li key={entry.club._id + ':' + entry.event._id}>
          <DiscoverEventCard entry={entry} layout="card" />
        </li>
      ))}
      {directory.loading && (
        <li role="status" className="py-5 text-sm text-muted">
          Loading events…
        </li>
      )}
      {directory.error && (
        <li role="alert" className="space-y-2 py-5 text-sm text-red-700">
          <p>{directory.error}</p>
          <button
            type="button"
            className="font-semibold underline"
            onClick={directory.retry}
          >
            Try again
          </button>
        </li>
      )}
      {!directory.loading && !directory.error && !directory.entries.length && (
        <li role="status" className="py-5 text-sm text-muted">
          No upcoming events.
        </li>
      )}
    </HorizontalCardRow>
  )
}
