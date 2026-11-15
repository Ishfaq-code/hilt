import { Workspace } from '../components/layout/Workspace'

import { AdminOverview } from '../components/admin/AdminOverview'
import { ApplicationReviews } from '../components/admin/ApplicationReviews'
import { OrganizationModeration } from '../components/admin/OrganizationModeration'
import { PlatformStatistics } from '../components/admin/PlatformStatistics'
import { useAdministration } from '../hooks/useAdministration'

export default function AdminDashboardPage() {
  const administration = useAdministration()
  const { activeTab, activeLabel, workspaceNav, loading, error } =
    administration

  return (
    <Workspace
      title="Platform administration"
      nav={workspaceNav}
      active={activeLabel}
    >
      {error && (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {error}
        </p>
      )}
      {loading && (
        <p className="text-sm text-muted">Loading administration data…</p>
      )}
      {!loading && activeTab === 'overview' && (
        <AdminOverview
          stats={administration.stats}
          setSearchParams={administration.setSearchParams}
        />
      )}
      {!loading && activeTab === 'applications' && (
        <ApplicationReviews
          selected={administration.selected}
          setSelected={administration.setSelected}
          reviewing={administration.reviewing}
          review={administration.review}
          query={administration.query}
          setQuery={administration.setQuery}
          statusFilter={administration.statusFilter}
          setStatusFilter={administration.setStatusFilter}
          matchingApplications={administration.matchingApplications}
        />
      )}
      {!loading && activeTab === 'organizations' && (
        <OrganizationModeration
          organizationStats={administration.organizationStats}
          setOrganizationStats={administration.setOrganizationStats}
          query={administration.query}
          setQuery={administration.setQuery}
          matchingOrganizations={administration.matchingOrganizations}
          statsLoading={administration.statsLoading}
          showStatistics={administration.showStatistics}
          moderate={administration.moderate}
        />
      )}
      {!loading && activeTab === 'statistics' && (
        <PlatformStatistics
          stats={administration.stats}
          organizations={administration.organizations}
          showStatistics={administration.showStatistics}
        />
      )}
    </Workspace>
  )
}
