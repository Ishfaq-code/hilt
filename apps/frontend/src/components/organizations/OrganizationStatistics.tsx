import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts'
import MetricCard from '../ui/MetricCard'
import { StatisticsChart } from '../admin/StatisticsChart'
import type { OrgStats } from '../../types/administration'

export function OrganizationStatistics({
  statistics,
}: {
  statistics?: OrgStats
}) {
  if (!statistics) {
    return (
      <p className="text-sm text-muted">Loading organization statistics…</p>
    )
  }

  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Members" value={statistics.totalMembers} />
        <MetricCard label="Paid memberships" value={statistics.paidMembers} />
        <MetricCard
          label="Unpaid memberships"
          value={statistics.unpaidMembers}
        />
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <StatisticsChart
          title="Paid vs. Unpaid Memberships"
          caption="Current organization members grouped by whether their membership fee has been marked as paid."
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: 'Paid', value: statistics.paidMembers },
                  { name: 'Unpaid', value: statistics.unpaidMembers },
                ]}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={88}
                paddingAngle={3}
                label
              >
                <Cell fill="#168a73" />
                <Cell fill="#e5a23d" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </StatisticsChart>

        <StatisticsChart
          title="Current vs. Projected Membership Revenue"
          caption={`Current revenue is paid memberships × the $${statistics.membershipFee} fee. Projected revenue assumes all ${statistics.totalMembers} members pay.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                {
                  label: 'Current revenue',
                  revenue: statistics.currentRevenue,
                },
                {
                  label: 'Projected revenue',
                  revenue: statistics.projectedRevenue,
                },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" />
              <YAxis tickFormatter={(value: number) => `$${value}`} />
              <Tooltip
                formatter={(value) => [
                  `$${Number(value).toFixed(2)}`,
                  'Revenue',
                ]}
              />
              <Bar
                dataKey="revenue"
                name="Revenue"
                fill="#168a73"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </StatisticsChart>

        <StatisticsChart
          title="Attendance by Event"
          caption="Active check-ins recorded for each published event. Reversed check-ins are excluded; events with no attendance are shown as zero."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statistics.eventAttendance} margin={{ bottom: 42 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                interval={0}
                angle={-25}
                textAnchor="end"
                height={60}
              />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar
                dataKey="attendance"
                name="Active check-ins"
                fill="#5284c4"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </StatisticsChart>
      </div>
    </section>
  )
}
