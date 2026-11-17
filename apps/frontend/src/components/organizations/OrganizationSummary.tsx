import type { Organization } from '../../types'
import type { ManagedEvent } from '../../types/management'
import { EventBanner } from '../events/EventBanner'
import { EventPreviewButton } from '../events/EventPreviewButton'
import { Icon } from '../ui/Icon'
import { panelClass } from '../ui/styles'

type Props = {
  organization: Organization
  upcoming?: ManagedEvent
}

export function OrganizationSummary({ organization, upcoming }: Props) {
  return (
    <div className="space-y-6 py-6">
      <section>
        <h2 className="mb-3 text-xl font-semibold">About</h2>
        <p className="text-sm leading-relaxed text-muted">
          {organization.description ||
            'Learn more about this club and connect with its members.'}
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
      <section>
        <h2 className="mb-3 text-xl font-semibold">Membership Fee</h2>
        <div className="inline-flex min-w-48 items-center rounded-xl border border-accent/25 bg-soft px-5 py-4 text-2xl font-bold text-accent">
          {organization.membershipFee
            ? `$${organization.membershipFee}`
            : 'Free'}
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-xl font-semibold">Next Up</h2>
        {upcoming ? (
          <div className={panelClass + ' overflow-hidden'}>
            <EventBanner
              src={upcoming.banner}
              className="aspect-[3/1] w-full"
            />
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
      </section>
    </div>
  )
}
