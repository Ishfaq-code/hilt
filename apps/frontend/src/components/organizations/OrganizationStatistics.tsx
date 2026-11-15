import { panelClass } from '../ui/styles'

import type { OrganizationManagement } from '../../hooks/useOrganizationManagement'

type Props = Pick<OrganizationManagement, 'stats' | 'members' | 'events'>

export function OrganizationStatistics({ stats, members, events }: Props) {
  return (
    <section>
      <h1 className="mb-5 text-3xl font-semibold tracking-tight">Statistics</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          {
            label: 'Total members',
            value: stats?.totalMembers ?? members.length,
          },
          {
            label: 'Paid dues',
            value:
              stats?.paidMembers ??
              members.filter((member) => member.isPaid).length,
          },
          {
            label: 'Organization events',
            value: stats?.events ?? events.length,
          },
          { label: 'Owners', value: stats?.roles.owner ?? 0 },
          { label: 'Officers', value: stats?.roles.officer ?? 0 },
          { label: 'Members', value: stats?.roles.student ?? 0 },
        ].map((metric) => (
          <article key={metric.label} className={`${panelClass} p-4 sm:p-5`}>
            <h2 className="text-sm font-semibold">{metric.label}</h2>
            <p className="mt-4 text-3xl font-semibold tabular-nums">
              {metric.value}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
