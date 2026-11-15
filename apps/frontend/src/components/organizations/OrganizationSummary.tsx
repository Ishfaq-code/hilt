import type { Organization } from '../../types'
import type { ManagedEvent } from '../../types/management'
import { EventPreviewButton } from '../events/EventPreviewButton'
import { Icon } from '../ui/Icon'
import { panelClass } from '../ui/styles'

type Props = {
  organization: Organization
  upcoming?: ManagedEvent
  eventCount: number
  onShowEvents: () => void
}

export function OrganizationSummary({
  organization,
  upcoming,
  eventCount,
  onShowEvents,
}: Props) {
  return (
    <div className="grid gap-6 py-6 sm:grid-cols-[2fr_1fr]">
      <section>
        <h2 className="mb-3 text-xl font-semibold">Next up</h2>
        {upcoming ? (
          <div className={panelClass}>
            <div className="p-4">
              <p className="mb-1 text-sm font-semibold text-accent">
                {new Date(upcoming.startDatetime).toLocaleDateString(
                  undefined,
                  { month: 'long', day: 'numeric', year: 'numeric' },
                )}
              </p>
              <h3 className="text-lg font-semibold">
                <EventPreviewButton
                  club={organization}
                  event={upcoming}
                  className="text-left hover:underline"
                />
              </h3>
              <p className="mt-1 text-sm text-muted">
                {new Date(upcoming.startDatetime).toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
                {upcoming.place ? ` · ${upcoming.place}` : ''}
              </p>
              {upcoming.description && (
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {upcoming.description}
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">No upcoming events.</p>
        )}
        {eventCount > (upcoming ? 1 : 0) && (
          <button
            type="button"
            onClick={onShowEvents}
            className="mt-3 inline-block text-sm font-semibold text-accent hover:underline"
          >
            All events →
          </button>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-xl font-semibold">About</h2>
        <p className="text-sm leading-relaxed text-muted">
          {organization.description ||
            'Learn more about this organization and connect with its members.'}
        </p>
        <p className="mt-4 text-sm text-muted">
          Membership dues:{' '}
          {organization.membershipFee
            ? `$${organization.membershipFee}`
            : 'Free'}
        </p>
        {organization.profile && (
          <a
            href={organization.profile}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
          >
            Website <Icon name="arrow" size={14} />
          </a>
        )}
      </section>
    </div>
  )
}
