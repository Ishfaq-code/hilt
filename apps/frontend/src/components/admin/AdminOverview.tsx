import { Icon } from '../ui/Icon'
import { panelClass } from '../ui/styles'

import type { Administration } from '../../hooks/useAdministration'

type Props = Pick<Administration, 'stats' | 'setSearchParams'>

export function AdminOverview({ stats, setSearchParams }: Props) {
  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">Administration</h1>
      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {[
          {
            tab: 'applications' as const,
            title: 'Organization applications',
            count: stats?.pendingApplications || 0,
            label: 'pending review',
          },
          {
            tab: 'organizations' as const,
            title: 'Organizations',
            count: stats?.organizations || 0,
            label: 'active organizations',
          },
          {
            tab: 'statistics' as const,
            title: 'Platform statistics',
            count: stats?.users || 0,
            label: 'registered users',
          },
        ].map((item) => (
          <button
            key={item.tab}
            type="button"
            onClick={() => setSearchParams({ tab: item.tab })}
            className={`${panelClass} block p-4 text-left hover:bg-paper`}
          >
            <span className="flex items-start justify-between gap-2 font-semibold">
              {item.title}
              <Icon name="arrow" size={16} />
            </span>
            <span className="mt-4 block text-3xl font-semibold tabular-nums">
              {item.count}
            </span>
            <span className="mt-1 block text-sm text-muted">{item.label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
