import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthPage } from '../../hooks/useAuthPage'
import { useSiteSession } from '../../hooks/useCurrentUser'
import { api } from '../../lib/api'
import { joinClub } from '../../lib/clubs'
import { clubPath } from '../../lib/events'
import type { Organization } from '../../types'
import type { Membership } from '../../types/management'
import { SharedEventDialog } from '../events/SharedEventDialog'
import { Dialog } from '../ui/Dialog'

import { ClubDetailsDialog } from './ClubDetailsDialog'

export function ClubPreview({
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
  const returnToEvent = useRef<{ id: string; scrollTop: number } | null>(null)
  const activeEventId = eventId || openedEvent
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
    <ClubDetailsDialog
      club={club}
      detailsLoaded={Boolean(details)}
      joined={joined}
      managePath={canManage ? managePath : undefined}
      busy={busy}
      loading={loading}
      message={message}
      onJoin={() => void join()}
      onOpenEvent={(event, trigger) => {
        returnToEvent.current = {
          id: event._id,
          scrollTop: trigger.closest('dialog')?.scrollTop ?? 0,
        }
        setOpenedEvent(event._id)
      }}
      onOpen={(dialog) => {
        const position = returnToEvent.current
        if (!position) return
        dialog.scrollTop = position.scrollTop
        dialog
          .querySelector<HTMLButtonElement>(
            `[data-event-id="${CSS.escape(position.id)}"]`,
          )
          ?.focus({ preventScroll: true })
      }}
      onClose={onClose}
    />
  )
}
