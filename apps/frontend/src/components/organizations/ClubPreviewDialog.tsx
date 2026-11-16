import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthPage } from '../../hooks/useAuthPage'
import { useSiteSession } from '../../hooks/useCurrentUser'
import { useToast } from '../../hooks/useToast'
import { api } from '../../lib/api'
import { joinClub, myClubPath } from '../../lib/clubs'
import { clubPath } from '../../lib/events'
import type { Organization } from '../../types'
import type { Membership } from '../../types/management'
import { OrganizationEventList } from '../events/OrganizationEventList'
import { SharedEventDialog } from '../events/SharedEventDialog'
import { Dialog } from '../ui/Dialog'
import { buttonClass, secondaryClass } from '../ui/styles'
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
  const navigate = useNavigate()
  const openLogin = useAuthPage()
  const { user, token } = useSiteSession()
  const { toast } = useToast()
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

  const myClubs = myClubPath(clubId)
  const managePath = clubPath(clubId) + '/manage'
  const canManage =
    user?.role === 'user' &&
    token === managementToken &&
    location.pathname !== managePath

  async function join() {
    if (!signedIn) {
      openLogin({
        from: location.pathname + location.search + location.hash,
        joinOrganizationId: clubId,
        joinOrganizationName: club?.name,
      })
      return
    }

    setBusy(true)
    setError('')
    try {
      const added = await joinClub(clubId)
      if (added) toast({ title: 'Club joined', description: club?.name })
      if (eventId) {
        setDetails(await api<Organization>('/api' + clubPath(clubId)))
        setJoined(true)
      } else {
        navigate(myClubs, { replace: true })
      }
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
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {details.profile && (
            <a
              href={details.profile}
              target="_blank"
              rel="noreferrer"
              className={secondaryClass}
            >
              Website
            </a>
          )}
          {canManage && (
            <Link to={managePath} className={secondaryClass}>
              Manage
            </Link>
          )}
          {joined ? (
            <Link to={myClubs} className={buttonClass}>
              My clubs
            </Link>
          ) : (
            <button
              type="button"
              className={buttonClass}
              disabled={busy}
              onClick={() => void join()}
            >
              {busy ? 'Joining…' : 'Interested'}
            </button>
          )}
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
