import { Link } from 'react-router-dom'
import type { JoinedOrganization } from '../../types/management'
import { panelClass } from '../ui/styles'
import { Cover } from './Cover'
import { OrganizationAvatar } from './OrganizationAvatar'

type Props = {
  selected: JoinedOrganization
  tab: 'Home' | 'Events'
  setTab: (tab: 'Home' | 'Events') => void
}

export function JoinedOrganizationDetails({ selected, tab, setTab }: Props) {
  const events = [...(selected?.events || [])].sort(
    (a, b) => Date.parse(a.startDatetime) - Date.parse(b.startDatetime),
  )

  return (
    <article className={`${panelClass} overflow-hidden`}>
      <Cover organization={selected} large />
      <div className="relative px-5 pb-0 sm:px-8">
        <OrganizationAvatar
          organization={selected}
          className="-mt-7 size-15 text-lg"
        />
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-sm font-semibold text-accent">
              {selected.category || 'Student organization'}
            </p>
            <h2 className="text-3xl font-semibold tracking-tight">
              {selected.name}
            </h2>
          </div>
          <div className="ml-auto flex gap-2">
            <Link
              to={`/organizations/${selected._id}`}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold hover:bg-paper"
            >
              View organization
            </Link>
            {['owner', 'officer'].includes(selected._membershipRole) && (
              <Link
                to={`/organizations/${selected._id}/manage`}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-ink bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-active"
              >
                Manage
              </Link>
            )}
          </div>
        </div>
        <div className="mt-4 flex gap-6 overflow-x-auto border-b border-line">
          <button
            type="button"
            aria-current={tab === 'Home' ? 'page' : undefined}
            onClick={() => setTab('Home')}
            className={`shrink-0 border-b-2 py-3 text-sm font-semibold ${tab === 'Home' ? 'border-accent text-ink' : 'border-transparent text-muted'}`}
          >
            Home
          </button>
          <button
            type="button"
            aria-current={tab === 'Events' ? 'page' : undefined}
            onClick={() => setTab('Events')}
            className={`shrink-0 border-b-2 py-3 text-sm font-semibold ${tab === 'Events' ? 'border-accent text-ink' : 'border-transparent text-muted'}`}
          >
            Events
          </button>
        </div>
        {tab === 'Events' ? (
          <div className="py-5">
            {events.length ? (
              <ul className="divide-y divide-line">
                {events.map((event) => (
                  <li
                    key={event._id}
                    className="flex flex-wrap justify-between gap-3 py-4"
                  >
                    <div>
                      <h3 className="font-semibold">{event.name}</h3>
                      <p className="mt-1 text-sm text-muted">
                        {new Date(event.startDatetime).toLocaleString()}
                        {event.place ? ` · ${event.place}` : ''}
                      </p>
                      {event.description && (
                        <p className="mt-2 text-sm text-muted">
                          {event.description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted">
                      {event.type || 'Event'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No events yet.</p>
            )}
          </div>
        ) : (
          <div className="grid gap-6 py-6 sm:grid-cols-[2fr_1fr]">
            <section>
              <h3 className="mb-3 text-xl font-semibold">Next up</h3>
              {events[0] ? (
                <div className={`${panelClass} p-4`}>
                  <p className="text-sm font-semibold text-accent">
                    {new Date(events[0].startDatetime).toLocaleDateString(
                      undefined,
                      {
                        month: 'long',
                        day: 'numeric',
                      },
                    )}
                  </p>
                  <h4 className="mt-1 font-semibold">{events[0].name}</h4>
                  <p className="mt-1 text-sm text-muted">
                    {new Date(events[0].startDatetime).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                    {events[0].place ? ` · ${events[0].place}` : ''}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted">No upcoming events.</p>
              )}
            </section>
            <section>
              <h3 className="mb-3 text-xl font-semibold">About</h3>
              <p className="text-sm leading-relaxed text-muted">
                {selected.description ||
                  'Organization information will appear here.'}
              </p>
            </section>
          </div>
        )}
      </div>
    </article>
  )
}
