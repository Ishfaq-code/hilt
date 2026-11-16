import { DiscoverEventList } from '../components/events/DiscoverEventList'
import { useClubDirectory } from '../hooks/useClubDirectory'

export default function EventsPage() {
  const { clubs } = useClubDirectory()

  return (
    <section className="mx-auto max-w-6xl px-4 pt-9 sm:px-8 sm:pt-13">
      <h1 className="text-4xl font-semibold tracking-tight">All events</h1>
      <DiscoverEventList
        clubs={clubs}
        pageSize={10}
        title="Most RSVPed upcoming events"
      />
    </section>
  )
}
