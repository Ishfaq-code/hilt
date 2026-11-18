import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthPage } from '../../hooks/useAuthPage'
import { useSiteSession } from '../../hooks/useCurrentUser'
import { api } from '../../lib/api'
import { joinClub, myClubPath } from '../../lib/clubs'
import { clubPath } from '../../lib/events'
import type { Organization } from '../../types'
import type { Membership } from '../../types/management'
import { OrganizationEventList } from '../events/OrganizationEventList'
import { SharedEventDialog } from '../events/SharedEventDialog'
import { Dialog } from '../ui/Dialog'
import { secondaryClass } from '../ui/styles'
import { ClubJoinControl } from './ClubJoinControl'
import { ClubReportButton } from './ClubReportButton'
import { Cover } from './Cover'
import { OrganizationAvatar } from './OrganizationAvatar'

export function ClubPreviewDialog({
  clubId,
  eventId,
  initialClub,
  onClose,
  onOpenClub,
}: {
  clubId: string
  eventId?: string | null
  initialClub?: Organization
  onClose: () => void
  onOpenClub?: () => void
}) {
  const openLogin = useAuthPage()
  const { user, token } = useSiteSession()
  const location = useLocation()
  const [details, setDetails] = useState<Organization | null>(null)
  const [joined, setJoined] = useState(false)
  const [managementToken, setManagementToken] = useState<string>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [openedEvent, setOpenedEvent] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now)
  const activeEventId = eventId || openedEvent
  const signedIn = Boolean(token)
  const message = error || location.state?.joinError

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const request = new AbortController()
    const options = { signal: request.signal }
    Promise.all([
      api<Organization>('/api' + clubPath(clubId), options),
      signedIn ? api<Membership[]>('/api/memberships/mine', options) : [],
    ])
      .then(([club, memberships]) => {
        if (request.signal.aborted) return
        const membership = memberships.find(
          (item) => item.organizationId?._id === clubId,
        )
        setDetails(club)
        setJoined(Boolean(membership))
        setManagementToken(
          membership?.permissions.length ? (token ?? undefined) : undefined,
        )
      })
      .catch((cause: unknown) => {
        if (!request.signal.aborted) {
          setError(
            cause instanceof Error ? cause.message : 'Couldn’t load the club.',
          )
        }
      })
      .finally(() => {
        if (!request.signal.aborted) setLoading(false)
      })
    return () => request.abort()
  }, [clubId, signedIn, token])

  const managePath = clubPath(clubId) + '/manage'
  const canManage =
    user?.role === 'user' &&
    token === managementToken &&
    location.pathname !== managePath

  async function join() {
    if (!signedIn) {
      const params = new URLSearchParams(location.search)
      params.set('club', clubId)
      if (activeEventId) params.set('event', activeEventId)
      openLogin({
        from: location.pathname + '?' + params + location.hash,
        joinOrganizationId: clubId,
      })
      return
    }

    setBusy(true)
    setError('')
    try {
      await joinClub(clubId)
      setJoined(true)
      setDetails(await api<Organization>('/api' + clubPath(clubId)))
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Couldn’t join the club.',
      )
    } finally {
      setBusy(false)
    }
  }

  const club = details ?? initialClub
  const events = (details?.events ?? [])
    .filter((event) => Date.parse(event.startDatetime) >= now)
    .sort((a, b) => Date.parse(a.startDatetime) - Date.parse(b.startDatetime))

  if (activeEventId && club) {
    return (
      <SharedEventDialog
        key={activeEventId}
        club={club}
        eventId={activeEventId}
        join={() => void join()}
        busy={busy}
        message={message}
        onClose={eventId ? onClose : () => setOpenedEvent(null)}
        onOpenClub={() => {
          setOpenedEvent(null)
          if (eventId) onOpenClub?.()
        }}
      />
    )
  }

  if (activeEventId) {
    return (
      <Dialog title="Event" onClose={onClose}>
        {message ? (
          <p role="alert">{message}</p>
        ) : (
          <p role="status">Loading event…</p>
        )}
      </Dialog>
    )
  }

  return (
    <Dialog title={club?.name ?? 'Club'} onClose={onClose}>
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
      {details && (
        <div className="mt-5 flex items-start justify-between gap-4">
          <div className="flex min-h-10 flex-wrap items-center gap-4">
            {details.profile && (
              <a
                href={details.profile}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink hover:underline hover:underline-offset-4"
              >
                Website
                <span aria-hidden="true">↗</span>
              </a>
            )}
            {canManage && (
              <Link to={managePath} className={secondaryClass}>
                Manage
              </Link>
            )}
          </div>
          <ClubJoinControl
            clubId={clubId}
            joined={joined}
            busy={busy}
            onJoin={() => void join()}
          />
        </div>
      )}
      {details && (
        <section className="mt-5 border-t border-line pt-5">
          <h3 className="font-semibold">Upcoming events</h3>
          {events.length ? (
            <OrganizationEventList
              club={details}
              events={events.slice(0, 3)}
              onOpenEvent={(event) => setOpenedEvent(event._id)}
            />
          ) : (
            <p className="py-5 text-sm text-muted">No upcoming events.</p>
          )}
          {events.length > 3 && (
            <div className="pb-5 text-sm text-muted">
              {joined ? (
                <Link
                  to={myClubPath(clubId)}
                  className="underline underline-offset-4 hover:text-ink"
                >
                  See more in My clubs
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  className="underline underline-offset-4 hover:text-ink disabled:cursor-wait disabled:opacity-50"
                  onClick={() => void join()}
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
          <ClubReportButton clubId={clubId} />
        </div>
      )}
    </Dialog>
  )
}
