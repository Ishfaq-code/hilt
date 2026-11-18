import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
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

export function DiscoverEventCard({
  entry,
  layout = 'row',
}: {
  entry: Entry
  layout?: 'row' | 'card'
}) {
  const { toast } = useToast()
  const openLogin = useAuthPage()
  const token = useAuthToken()
  const location = useLocation()
  const [participation, setParticipation] = useState<{
    token: string
    rsvped: boolean
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now)

  const { club, event } = entry
  const imageSource =
    event.banner ||
    club.assets?.find((asset) => /logo|icon/i.test(asset.type))?.link
  const endpoint = eventApi(club._id, event._id)
  const url = new URL(eventPath(club._id, event._id), window.location.origin)
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
        await navigator.share({ url: url.href, title: event.name })
      } else {
        await navigator.clipboard.writeText(url.href)
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
  const vertical = layout === 'card'
  const preview = new URLSearchParams(location.search)
  preview.set('club', club._id)
  preview.set('event', event._id)

  return (
    <article
      className={
        panelClass +
        (vertical ? ' flex h-full flex-col overflow-hidden' : ' p-3')
      }
    >
      <div
        className={
          vertical
            ? 'flex flex-1 flex-col'
            : 'grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 sm:grid-cols-[6.5rem_minmax(0,1fr)_auto]'
        }
      >
        <div
          className={
            'relative grid place-items-center overflow-hidden bg-paper ' +
            (vertical ? 'h-28 shrink-0' : 'aspect-[4/3] rounded-md')
          }
        >
          {imageSource ? (
            <EventBanner src={imageSource} className="h-full w-full" />
          ) : (
            <OrganizationAvatar
              organization={club}
              className="size-10 text-xs sm:size-12"
            />
          )}
          <div
            aria-hidden="true"
            className={
              'absolute grid min-w-11 justify-items-center rounded-md border border-line bg-white px-2 py-1 shadow-sm ' +
              (vertical
                ? 'top-2.5 left-2.5'
                : 'inset-y-1 left-1 content-center')
            }
          >
            <span className="text-[10px] font-bold tracking-wider text-accent uppercase">
              {start.toLocaleDateString(undefined, { month: 'short' })}
            </span>
            <span className="text-2xl leading-7 font-semibold tabular-nums">
              {start.getDate()}
            </span>
          </div>
        </div>

        <div className={'min-w-0' + (vertical ? ' flex-1 px-4 pt-3' : '')}>
          <p className="line-clamp-1 text-xs text-muted">{club.name}</p>
          <h3 className="mt-0.5 font-semibold leading-snug text-ink">
            <Link
              to={{ search: '?' + preview }}
              aria-haspopup="dialog"
              className="hover:text-accent hover:underline"
            >
              {event.name}
            </Link>
          </h3>
          {event.tags.length > 0 && (
            <p className="mt-1 text-[11px] font-medium text-accent">
              {event.tags.slice(0, 2).join(' · ')}
            </p>
          )}
          <div
            className={
              'mt-1 flex gap-x-3 gap-y-0.5 text-xs text-muted ' +
              (vertical ? 'flex-col' : 'flex-wrap')
            }
          >
            <time dateTime={event.startDatetime}>
              {start.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}{' '}
              @{' '}
              {start.toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </time>
            {event.place && <span className="line-clamp-1">{event.place}</span>}
            <span>{entry.rsvpCount} going</span>
          </div>
        </div>

        <div
          className={
            'flex items-center justify-end gap-2 ' +
            (vertical ? 'px-4 pt-3 pb-4' : 'col-span-full sm:col-span-1')
          }
        >
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
              className={buttonClass}
              onClick={() =>
                openLogin({
                  from: location.pathname + '?' + preview + location.hash,
                })
              }
            >
              Log in to RSVP
            </button>
          )}
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
      </div>
      {error && (
        <p
          role="alert"
          className={
            'mt-2 text-sm text-red-700' + (vertical ? 'px-4 pb-4' : '')
          }
        >
          {error}
        </p>
      )}
    </article>
  )
}
