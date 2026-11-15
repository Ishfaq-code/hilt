import { Link } from 'react-router-dom'
import { upcomingEvent } from '../../lib/events'
import type { JoinedOrganization } from '../../types/management'
import { OrganizationEventList } from '../events/OrganizationEventList'
import { OrganizationSummary } from './OrganizationSummary'
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
          <OrganizationEventList club={selected} events={events} />
        ) : (
          <OrganizationSummary
            organization={selected}
            upcoming={upcomingEvent(events)}
            eventCount={events.length}
            onShowEvents={() => setTab('Events')}
          />
        )}
      </div>
    </article>
  )
}
