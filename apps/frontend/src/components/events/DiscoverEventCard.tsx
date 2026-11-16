import { useEffect, useState } from 'react'
import { useAuthPage } from '../../hooks/useAuthPage'
import { useAuthToken } from '../../hooks/useAuthToken'
import { useToast } from '../../hooks/useToast'
import { api } from '../../lib/api'
import { eventApi, eventPath, rsvpChangedEvent } from '../../lib/events'
import type { Organization } from '../../types'
import type { ManagedEvent } from '../../types/management'
import { Icon } from '../ui/Icon'
import { buttonClass, panelClass, secondaryClass } from '../ui/styles'
import { EventBanner } from './EventBanner'
import { RsvpButton } from './RsvpButton'
import { OrganizationAvatar } from '../organizations/OrganizationAvatar'

type Entry = {
  club: Pick<Organization, '_id' | 'name' | 'tags' | 'assets'>
  event: ManagedEvent
  rsvpCount: number
}

type Participation = { rsvped: boolean }

export function DiscoverEventCard({ entry }: { entry: Entry }) {
  const { toast } = useToast()
  const openLogin = useAuthPage()
  const token = useAuthToken()
  const [participation, setParticipation] = useState<{
    token: string
    rsvped: boolean
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now)

  const { club, event } = entry
  const endpoint = eventApi(club._id, event._id)
  const path = eventPath(club._id, event._id)
  const url = new URL(path, window.location.origin).href
  const start = new Date(event.startDatetime)
  const hasStarted = now >= start.getTime()

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!token) return

    const request = new AbortController()
    api<Participation>(endpoint + '/participation', { signal: request.signal })
      .then((result) => {
        if (!request.signal.aborted) {
          setParticipation({ token, rsvped: result.rsvped })
        }
      })
      .catch((cause: unknown) => {
        if (!request.signal.aborted) {
          setError(
            cause instanceof Error ? cause.message : 'Couldn’t load your RSVP.',
          )
        }
      })
    return () => request.abort()
  }, [endpoint, token])

  async function share() {
    setError('')
    try {
      if (navigator.share) {
        await navigator.share({ url, title: event.name })
      } else {
        await navigator.clipboard.writeText(url)
        toast({ title: 'Link copied' })
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      setError('Couldn’t share this event.')
    }
  }

  async function rsvp(interested: boolean) {
    setBusy(true)
    setError('')
    try {
      const result = await api<{ rsvped: boolean }>(endpoint + '/rsvp', {
        method: 'PUT',
        body: JSON.stringify({ interested }),
      })
      setParticipation({ token: token ?? '', rsvped: result.rsvped })
      window.dispatchEvent(new Event(rsvpChangedEvent))
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Couldn’t update your RSVP.',
      )
    } finally {
      setBusy(false)
    }
  }

  const rsvped = participation?.token === token && participation.rsvped
  const participationLoaded = participation?.token === token

  return (
    <article className={panelClass + ' overflow-visible'}>
      <EventBanner
        src={event.banner}
        className="aspect-[3/1] w-full rounded-t-xl"
      />
      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <OrganizationAvatar
              organization={club}
              className="size-12 shrink-0 text-xs"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-[0.12em] text-accent uppercase sm:text-sm">
                {club.name}
              </p>
              <h3 className="mt-1 text-xl font-bold tracking-tight text-ink sm:text-2xl">
                {event.name}
              </h3>
              <p className="mt-1 text-xs font-medium text-muted">
                {entry.rsvpCount} {entry.rsvpCount === 1 ? 'RSVP' : 'RSVPs'}
              </p>
              {event.description && (
                <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">
                  {event.description}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            aria-label="Share event"
            title="Share event"
            className={secondaryClass + ' size-10 shrink-0 p-0!'}
            onClick={() => void share()}
          >
            <Icon name="share" />
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-2 text-sm text-muted sm:text-base">
            <p className="flex items-start gap-3">
              <Icon name="calendar" size={20} />
              <time dateTime={event.startDatetime}>
                {start.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                @{' '}
                {start.toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </time>
            </p>
            {event.place && (
              <p className="flex items-start gap-3">
                <Icon name="pin" size={20} />
                <span>{event.place}</span>
              </p>
            )}
          </div>
          {hasStarted ? (
            <button type="button" className={secondaryClass} disabled>
              {rsvped && <Icon name="check" size={16} />}
              {rsvped ? 'Going' : 'RSVP closed'}
            </button>
          ) : token ? (
            <RsvpButton
              going={Boolean(rsvped)}
              disabled={busy || !participationLoaded}
              onClick={() => void rsvp(!rsvped)}
            />
          ) : (
            <button
              type="button"
              aria-haspopup="dialog"
              className={buttonClass}
              onClick={() => openLogin()}
            >
              Log in to RSVP
            </button>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </article>
  )
}
