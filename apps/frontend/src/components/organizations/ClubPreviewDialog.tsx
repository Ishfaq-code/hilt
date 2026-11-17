import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthPage } from '../../hooks/useAuthPage'
import { useSiteSession } from '../../hooks/useCurrentUser'
import { api } from '../../lib/api'
import { joinClub } from '../../lib/clubs'
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
  onCloseEvent = onClose,
}: {
  clubId: string
  eventId?: string | null
  initialClub?: Organization
  onClose: () => void
  onCloseEvent?: () => void
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
  const signedIn = Boolean(token)
  const message = error || location.state?.joinError

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
      if (eventId) params.set('event', eventId)
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
  const events = [...(details?.events ?? [])].sort(
    (a, b) => Date.parse(a.startDatetime) - Date.parse(b.startDatetime),
  )

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
          <h3 className="font-semibold">Events</h3>
          <OrganizationEventList club={details} events={events} />
        </section>
      )}
      {club && (
        <div className="flex justify-end border-t border-line pt-3">
          <ClubReportButton clubId={clubId} />
        </div>
      )}
      {details && eventId && (
        <SharedEventDialog
          key={eventId}
          club={details}
          eventId={eventId}
          join={() => void join()}
          busy={busy}
          message={message}
          onClose={onCloseEvent}
        />
      )}
    </Dialog>
  )
}
