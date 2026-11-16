import { lazy, Suspense } from 'react'
import { Workspace } from '../components/layout/Workspace'

import { ApplicationReviews } from '../components/admin/ApplicationReviews'
import { Reports } from '../components/admin/Reports'
import { useAdministration } from '../hooks/useAdministration'

const PlatformStatistics = lazy(() =>
  import('../components/admin/PlatformStatistics').then((module) => ({
    default: module.PlatformStatistics,
  })),
)

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
        <>
          <Suspense
            fallback={<p className="text-sm text-muted">Loading charts…</p>}
          >
            <PlatformStatistics
              stats={administration.stats}
              organizations={administration.organizations}
              moderate={administration.moderate}
            />
          </Suspense>
        </>
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
      {!loading && activeTab === 'reports' && <Reports />}
    </Workspace>
  )
}
