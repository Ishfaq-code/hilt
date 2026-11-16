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
          <div className="grid gap-4 xl:grid-cols-2">
            <StatisticsChart title="Members in Organizations" caption="">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      {
                        name: 'In an organization',
                        value: stats.membersWithOrganizations,
                      },
                      {
                        name: 'Not in an organization',
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

            <StatisticsChart title="Organization applications" caption="">
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
