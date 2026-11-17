import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import MetricCard from '../ui/MetricCard'
import { AdminStatisticsTables } from './AdminStatisticsTables'
import { StatisticsChart } from './StatisticsChart'

import type { Administration } from '../../hooks/useAdministration'

type Props = Pick<Administration, 'stats' | 'organizations' | 'moderate'>

const applicationColors = ['#168a73', '#c75a5a', '#e5a23d']

export function PlatformStatistics({ stats, organizations, moderate }: Props) {
  return (
    <section>
      {stats && (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Total Number of Users"
              value={stats.users}
              centered
            />
            <MetricCard
              label="Total number of clubs"
              value={stats.organizations}
              centered
            />
            <MetricCard
              label="Total Number of Events"
              value={stats.totalEvents}
              centered
            />
            <MetricCard
              label="Total Number of Applications"
              value={stats.applications}
              centered
            />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <StatisticsChart title="Members in clubs">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      {
                        name: 'In a club',
                        value: stats.membersWithOrganizations,
                      },
                      {
                        name: 'Not in a club',
                        value: stats.membersWithoutOrganizations,
                      },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={3}
                    label
                  >
                    <Cell fill="#168a73" />
                    <Cell fill="#a8b2bf" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </StatisticsChart>

            <StatisticsChart title="Club applications">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    {
                      status: 'Approved',
                      count: stats.applicationStatuses.approved,
                    },
                    {
                      status: 'Rejected',
                      count: stats.applicationStatuses.denied,
                    },
                    {
                      status: 'Pending',
                      count: stats.applicationStatuses.pending,
                    },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="status" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    name="Applications"
                    radius={[4, 4, 0, 0]}
                  >
                    {applicationColors.map((color) => (
                      <Cell key={color} fill={color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </StatisticsChart>
          </div>
        </>
      )}
      <AdminStatisticsTables
        organizations={organizations}
        moderate={moderate}
      />
    </section>
  )
}
