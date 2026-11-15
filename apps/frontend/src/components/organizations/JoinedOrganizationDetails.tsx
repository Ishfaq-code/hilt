import { useState } from 'react'
import { Link } from 'react-router-dom'
import { upcomingEvent } from '../../lib/events'
import type { JoinedOrganization } from '../../types/management'
import { OrganizationEventList } from '../events/OrganizationEventList'
import { Dialog } from '../ui/Dialog'
import { OrganizationSummary } from './OrganizationSummary'
import {
  buttonClass,
  panelClass,
  secondaryClass,
  textActionClass,
} from '../ui/styles'
import { ClubReportButton } from './ClubReportButton'
import { Cover } from './Cover'
import { OrganizationAvatar } from './OrganizationAvatar'

type Props = {
  selected: JoinedOrganization
  tab: 'Home' | 'Events'
  setTab: (tab: 'Home' | 'Events') => void
  leaving: boolean
  onLeave: () => void
}

export function JoinedOrganizationDetails({
  selected,
  tab,
  setTab,
  leaving,
  onLeave,
}: Props) {
  const [confirmingLeave, setConfirmingLeave] = useState(false)
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
            {selected.tags.length > 0 && (
              <p className="mb-1 text-sm font-semibold text-accent">
                {selected.tags.join(' · ')}
              </p>
            )}
            <h2 className="text-3xl font-semibold tracking-tight">
              {selected.name}
            </h2>
          </div>
          <div className="ml-auto flex gap-2">
            {selected.permissions.length > 0 && (
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
        <div className="flex flex-wrap justify-end gap-x-4 border-t border-line py-3">
          {selected.roles.length === 0 && (
            <button
              type="button"
              className={textActionClass + ' disabled:opacity-50'}
              aria-haspopup="dialog"
              disabled={leaving}
              onClick={() => setConfirmingLeave(true)}
            >
              Not interested anymore
            </button>
          )}
          <ClubReportButton clubId={selected._id} />
        </div>
      </div>
      {confirmingLeave && (
        <Dialog
          title="Are you sure?"
          onClose={() => setConfirmingLeave(false)}
          compact
        >
          <p className="text-sm text-muted">Leave {selected.name}?</p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className={secondaryClass}
              onClick={() => setConfirmingLeave(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={() => {
                setConfirmingLeave(false)
                onLeave()
              }}
            >
              Leave club
            </button>
          </div>
        </Dialog>
      )}
    </article>
  )
}
