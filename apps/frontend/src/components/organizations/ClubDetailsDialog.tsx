import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { myClubPath } from '../../lib/clubs'
import type { Organization } from '../../types'
import type { ManagedEvent } from '../../types/management'
import { OrganizationEventList } from '../events/OrganizationEventList'
import { Dialog } from '../ui/Dialog'
import { secondaryClass } from '../ui/styles'
import { ClubJoinControl } from './ClubJoinControl'
import { ClubReportButton } from './ClubReportButton'
import { Cover } from './Cover'
import { OrganizationAvatar } from './OrganizationAvatar'

export function ClubDetailsDialog({
  club,
  detailsLoaded,
  joined,
  managePath,
  busy,
  loading,
  message,
  onJoin,
  onOpenEvent,
  onOpen,
  onClose,
}: {
  club?: Organization
  detailsLoaded: boolean
  joined: boolean
  managePath?: string
  busy: boolean
  loading: boolean
  message: string
  onJoin: () => void
  onOpenEvent: (event: ManagedEvent, trigger: HTMLButtonElement) => void
  onOpen: (dialog: HTMLDialogElement) => void
  onClose: () => void
}) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(interval)
  }, [])

  const events = (club?.events ?? [])
    .filter((event) => Date.parse(event.startDatetime) >= now)
    .sort((a, b) => Date.parse(a.startDatetime) - Date.parse(b.startDatetime))

  return (
    <Dialog title={club?.name ?? 'Club'} onClose={onClose} onOpen={onOpen}>
      {club && (
        <>
          <div className="overflow-hidden rounded-lg">
            <Cover organization={club} large />
          </div>
          <OrganizationAvatar
            organization={club}
            className="relative -mt-6 ml-3 size-12 text-xs"
          />
          {club.description && (
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {club.description}
            </p>
          )}
        </>
      )}
      {loading && (
        <p role="status" className="mt-4 text-sm text-muted">
          Loading club…
        </p>
      )}
      {message && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {message}
        </p>
      )}
      {club && detailsLoaded && (
        <div className="mt-5 flex items-start justify-between gap-4">
          <div className="flex min-h-10 flex-wrap items-center gap-4">
            {club.profile && (
              <a
                href={club.profile}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink hover:underline hover:underline-offset-4"
              >
                Website
                <span aria-hidden="true">↗</span>
              </a>
            )}
            {managePath && (
              <Link to={managePath} className={secondaryClass}>
                Manage
              </Link>
            )}
          </div>
          <ClubJoinControl
            clubId={club._id}
            joined={joined}
            busy={busy}
            onJoin={onJoin}
          />
        </div>
      )}
      {club && detailsLoaded && (
        <section className="mt-5 border-t border-line pt-5">
          <h3 className="font-semibold">Upcoming events</h3>
          {events.length ? (
            <OrganizationEventList
              club={club}
              events={events.slice(0, 3)}
              onOpenEvent={onOpenEvent}
            />
          ) : (
            <p className="py-5 text-sm text-muted">No upcoming events.</p>
          )}
          {events.length > 3 && (
            <div className="pb-5 text-sm text-muted">
              {joined ? (
                <Link
                  to={myClubPath(club._id, 'events')}
                  className="underline underline-offset-4 hover:text-ink"
                >
                  More upcoming events
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  className="underline underline-offset-4 hover:text-ink disabled:cursor-wait disabled:opacity-50"
                  onClick={onJoin}
                >
                  Join club to see more
                </button>
              )}
            </div>
          )}
        </section>
      )}
      {club && (
        <div className="flex justify-end border-t border-line pt-3">
          <ClubReportButton clubId={club._id} />
        </div>
      )}
    </Dialog>
  )
}
