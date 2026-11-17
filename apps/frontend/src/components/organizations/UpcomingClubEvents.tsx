import { useEffect, useState } from 'react'
import type { Organization } from '../../types'
import { OrganizationEventList } from '../events/OrganizationEventList'
import { textActionClass } from '../ui/styles'

const pageSize = 5

export function UpcomingClubEvents({ club }: { club: Organization }) {
  const [now, setNow] = useState(Date.now)
  const [visibleCount, setVisibleCount] = useState(pageSize)

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(interval)
  }, [])

  const events = (club.events ?? [])
    .filter((event) => Date.parse(event.startDatetime) >= now)
    .sort((a, b) => Date.parse(a.startDatetime) - Date.parse(b.startDatetime))

  if (!events.length) {
    return <p className="py-6 text-sm text-muted">No upcoming events.</p>
  }

  return (
    <>
      <OrganizationEventList
        club={club}
        events={events.slice(0, visibleCount)}
      />
      {events.length > visibleCount && (
        <div className="flex justify-center pb-5">
          <button
            type="button"
            className={textActionClass}
            onClick={() => setVisibleCount((count) => count + pageSize)}
          >
            Show more
          </button>
        </div>
      )}
    </>
  )
}
