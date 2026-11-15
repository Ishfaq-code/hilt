import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthDialog } from '../../hooks/useAuthDialog'
import { useAuthToken } from '../../hooks/useAuthToken'
import { useToast } from '../../hooks/useToast'
import { api } from '../../lib/api'
import { authPath, getAuthMode } from '../../lib/authDialog'
import { joinClub, myClubPath } from '../../lib/clubs'
import { clubPath } from '../../lib/events'
import type { Organization } from '../../types'
import type { Membership } from '../../types/management'
import { OrganizationEventList } from '../events/OrganizationEventList'
import { SharedEventDialog } from '../events/SharedEventDialog'
import { Dialog } from '../ui/Dialog'
import { buttonClass, secondaryClass } from '../ui/styles'
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
  const openLogin = useAuthDialog()
  const token = useAuthToken()
  const { toast } = useToast()
  const location = useLocation()
  const [details, setDetails] = useState<Organization | null>(null)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const signedIn = Boolean(token)
  const authOpen = Boolean(getAuthMode(location.search))
  const message = error || location.state?.joinError

  useEffect(() => {
    if (authOpen) return
    const request = new AbortController()
    const options = { signal: request.signal }
    Promise.all([
      api<Organization>('/api' + clubPath(clubId), options),
      signedIn ? api<Membership[]>('/api/memberships/mine', options) : [],
    ])
      .then(([club, memberships]) => {
        if (request.signal.aborted) return
        setDetails(club)
        setJoined(
          memberships.some(
            (membership) => membership.organizationId?._id === clubId,
          ),
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
  }, [clubId, signedIn, token, authOpen])

  const myClubs = myClubPath(clubId)

  async function join() {
    const from = authPath(location)
    if (!signedIn) {
      openLogin({
        from,
        joinOrganizationId: clubId,
        joinOrganizationName: club?.name,
        afterJoin: eventId ? from : undefined,
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
