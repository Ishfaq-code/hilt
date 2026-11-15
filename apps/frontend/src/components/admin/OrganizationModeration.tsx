import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { inputClass, panelClass, secondaryClass } from '../ui/styles'

import type { Administration } from '../../hooks/useAdministration'

type Props = Pick<
  Administration,
  | 'organizationStats'
  | 'setOrganizationStats'
  | 'query'
  | 'setQuery'
  | 'matchingOrganizations'
  | 'statsLoading'
  | 'showStatistics'
  | 'moderate'
>

export function OrganizationModeration({
  organizationStats,
  setOrganizationStats,
  query,
  setQuery,
  matchingOrganizations,
  statsLoading,
  showStatistics,
  moderate,
}: Props) {
  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">Organizations</h1>
      {organizationStats ? (
        <>
          <button
            type="button"
            className="my-5 inline-flex items-center gap-2 text-sm text-muted hover:text-ink"
            onClick={() => setOrganizationStats(null)}
          >
            <Icon name="back" size={15} />
            All organizations
          </button>
          <h2 className="mb-4 text-2xl font-semibold">
            {organizationStats.details.name}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              {
                label: 'Members',
                value: organizationStats.details.totalMembers,
              },
              {
                label: 'Paid dues',
                value: organizationStats.details.paidMembers,
              },
              { label: 'Events', value: organizationStats.details.events },
            ].map((metric) => (
              <article key={metric.label} className={`${panelClass} p-4`}>
                <p className="text-sm text-muted">{metric.label}</p>
                <p className="mt-3 text-3xl font-semibold tabular-nums">
                  {metric.value}
                </p>
              </article>
            ))}
          </div>
        </>
      ) : (
        <>
          <input
            className={`${inputClass} mt-5`}
            type="search"
            aria-label="Search organizations"
            placeholder="Search organizations"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {matchingOrganizations.length ? (
            <ul className={`${panelClass} mt-4 divide-y divide-line`}>
              {matchingOrganizations.map((organization) => (
                <li
                  key={organization._id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold">
                      {organization.name}
                    </span>
                    <span className="mt-1 block text-sm text-muted">
                      {organization.description || 'No description provided.'}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-2">
                    <Link
                      to={
                        '/admin/organizations/' +
                        organization._id +
                        '/manage?tab=roles'
                      }
                      className={secondaryClass}
                    >
                      Manage
                    </Link>
                    <button
                      className={secondaryClass}
                      disabled={statsLoading === organization._id}
                      onClick={() => void showStatistics(organization)}
                    >
                      {statsLoading === organization._id
                        ? 'Loading…'
                        : 'Statistics'}
                    </button>
                    <button
                      className={`${secondaryClass} text-red-700`}
                      onClick={() => void moderate(organization)}
                    >
                      Remove
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={`${panelClass} mt-4 p-5 text-sm text-muted`}>
              No organizations yet.
            </p>
          )}
        </>
      )}
    </section>
  )
}
