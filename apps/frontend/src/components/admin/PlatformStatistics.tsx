import MetricCard from '../ui/MetricCard'
import { panelClass } from '../ui/styles'

import type { Administration } from '../../hooks/useAdministration'

type Props = Pick<Administration, 'stats' | 'organizations' | 'showStatistics'>

export function PlatformStatistics({
  stats,
  organizations,
  showStatistics,
}: Props) {
  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">
        Application statistics
      </h1>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {stats && (
          <>
            <MetricCard
              label="Total organizations"
              value={stats.organizations}
            />
            <MetricCard label="Total users" value={stats.users} />
            <MetricCard label="Memberships" value={stats.memberships} />
            <MetricCard label="Applications" value={stats.applications} />
            <MetricCard
              label="Pending review"
              value={stats.pendingApplications}
            />
          </>
        )}
      </div>
      <h2 className="mt-8 mb-3 text-xl font-semibold">Organization activity</h2>
      <ul className={`${panelClass} divide-y divide-line`}>
        {organizations.map((organization) => (
          <li
            key={organization._id}
            className="flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <span className="font-semibold">{organization.name}</span>
            <span className="text-sm text-muted">
              {organization.memberCount}{' '}
              {organization.memberCount === 1 ? 'member' : 'members'} ·{' '}
              {organization.events?.length || 0} events
            </span>
            <button
              className="text-sm font-semibold text-accent hover:underline"
              onClick={() => void showStatistics(organization)}
            >
              View statistics
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
