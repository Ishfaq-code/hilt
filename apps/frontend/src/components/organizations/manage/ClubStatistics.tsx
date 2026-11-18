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
import type { OrgStats } from '../../../types/administration'
import { PublishedEventsTable } from '../../events/PublishedEventsTable'
import MetricCard from '../../ui/MetricCard'
import { StatisticsChart } from '../../ui/StatisticsChart'

export default function ClubStatistics({
  statistics,
}: {
  statistics: OrgStats
}) {
  const events = statistics.eventAttendance.map((event) => ({
    id: event.eventId,
    name: event.name,
    organizationName: statistics.name,
    startDatetime: event.startDatetime,
    endDatetime: event.endDatetime,
    rsvpCount: event.rsvpCount,
    attendanceCount: event.attendance,
  }))

  return (
    <>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <MetricCard
          label="Total Members"
          value={statistics.totalMembers}
          centered
        />
        <MetricCard
          label="Total Events"
          value={statistics.eventAttendance.length}
          centered
        />
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <StatisticsChart title="Paid vs. Unpaid Memberships">
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

        <StatisticsChart title="Current vs. Projected Membership Revenue">
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
      </div>
      <PublishedEventsTable events={events} showOrganization={false} />
    </>
  )
}
