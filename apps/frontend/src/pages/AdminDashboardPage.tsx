import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import MetricCard from '../components/molecules/MetricCard'
import {
  buttonClass,
  Icon,
  inputClass,
  panelClass,
  secondaryClass,
  Workspace,
} from '../components/wireframe/Design'
import { api } from '../lib/api'
import type { Application, Organization } from '../types'

type Stats = {
  users: number
  organizations: number
  memberships: number
  applications: number
  pendingApplications: number
}
type AdminOrganization = Organization & {
  memberCount: number
  createdAt?: string
}
type OrgStats = {
  name: string
  totalMembers: number
  paidMembers: number
  events: number
  roles: Record<string, number>
}
const nav = [
  { key: 'overview', label: 'Overview' },
  { key: 'applications', label: 'Applications' },
  { key: 'organizations', label: 'Organizations' },
  { key: 'statistics', label: 'Statistics' },
] as const
type Tab = (typeof nav)[number]['key']

export default function AdminDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('tab') || 'overview'
  const activeTab: Tab = nav.some((item) => item.key === requested)
    ? (requested as Tab)
    : 'overview'
  const [stats, setStats] = useState<Stats | null>(null)
  const [organizations, setOrganizations] = useState<AdminOrganization[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<Application | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [organizationStats, setOrganizationStats] = useState<{
    id: string
    details: OrgStats
  } | null>(null)
  const [statsLoading, setStatsLoading] = useState('')
  const load = useCallback(async () => {
    const [overview, orgs, apps] = await Promise.all([
      api<Stats>('/api/admin/statistics'),
      api<AdminOrganization[]>('/api/admin/organizations'),
      api<Application[]>('/api/applications'),
    ])
    setStats(overview)
    setOrganizations(orgs)
    setApplications(apps)
  }, [])
  useEffect(() => {
    let active = true
    Promise.resolve()
      .then(load)
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : 'Unable to load administration data.',
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [load])
  async function review(status: 'approved' | 'denied') {
    if (!selected) return
    setReviewing(true)
    setError('')
    setNotice('')
    try {
      const result = await api<Application>(
        `/api/applications/${selected._id}`,
        { method: 'PATCH', body: JSON.stringify({ status }) },
      )
      const updated = { ...result, userId: selected.userId }
      setApplications((items) =>
        items.map((item) => (item._id === updated._id ? updated : item)),
      )
      setSelected(updated)
      await load()
      setNotice(
        status === 'approved'
          ? `${updated.organizationName} was approved and created.`
          : `${updated.organizationName} was denied.`,
      )
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to update application.',
      )
    } finally {
      setReviewing(false)
    }
  }
  async function moderate(organization: AdminOrganization) {
    if (!window.confirm(`Remove ${organization.name} and its memberships?`))
      return
    setError('')
    setNotice('')
    try {
      await api(`/api/organizations/${organization._id}`, { method: 'DELETE' })
      setOrganizations((items) =>
        items.filter((item) => item._id !== organization._id),
      )
      await load()
      setNotice(`${organization.name} was removed.`)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to moderate organization.',
      )
    }
  }
  async function showStatistics(organization: AdminOrganization) {
    setSearchParams({ tab: 'organizations' })
    setStatsLoading(organization._id)
    setError('')
    try {
      const details = await api<OrgStats>(
        `/api/organizations/${organization._id}/statistics`,
      )
      setOrganizationStats({ id: organization._id, details })
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to load organization statistics.',
      )
    } finally {
      setStatsLoading('')
    }
  }
  const matchingApplications = applications.filter(
    (application) =>
      (statusFilter === 'all' || application.status === statusFilter) &&
      `${application.organizationName} ${application.organizationDescription || ''} ${typeof application.userId === 'string' ? '' : `${application.userId.firstName} ${application.userId.lastName} ${application.userId.email}`}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  )
  const matchingOrganizations = organizations.filter((organization) =>
    `${organization.name} ${organization.description || ''} ${organization.category || ''}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  )
  const workspaceNav = nav.map((item) => ({
    title: item.label,
    onClick: () => {
      setSearchParams({ tab: item.key })
      setSelected(null)
      setOrganizationStats(null)
      setQuery('')
    },
  }))
  return (
    <Workspace
      title="Platform administration"
      nav={workspaceNav}
      active={nav.find((item) => item.key === activeTab)?.label || 'Overview'}
    >
      {error && (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mb-4 text-sm text-active">
          {notice}
        </p>
      )}
      {loading && (
        <p className="text-sm text-muted">Loading administration data…</p>
      )}
      {!loading && activeTab === 'overview' && (
        <section>
          <h1 className="text-3xl font-semibold tracking-tight">
            Administration
          </h1>
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
                <span className="mt-1 block text-sm text-muted">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
      {!loading && activeTab === 'applications' && (
        <section>
          <h1 className="text-3xl font-semibold tracking-tight">
            Club applications
          </h1>
          {selected ? (
            <>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="my-5 inline-flex items-center gap-2 text-sm text-muted hover:text-ink"
              >
                <Icon name="back" size={15} />
                All applications
              </button>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold">
                    {selected.organizationName}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {selected.status === 'pending'
                      ? 'Pending review'
                      : selected.status}
                  </p>
                </div>
                <span className="rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-medium capitalize">
                  {selected.status}
                </span>
              </div>
              <p className="mt-4 mb-4 text-sm">
                {typeof selected.userId === 'string' ? (
                  'Applicant details unavailable'
                ) : (
                  <>
                    <span className="font-medium">Applicant</span> ·{' '}
                    {selected.userId.firstName} {selected.userId.lastName} ·{' '}
                    {selected.userId.email}
                  </>
                )}
              </p>
              <div className={`${panelClass} space-y-4 p-5`}>
                <div>
                  <h3 className="font-semibold">About this organization</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                    {selected.organizationDescription ||
                      'No description provided.'}
                  </p>
                </div>
                <div className="border-t border-line pt-4">
                  <h3 className="font-semibold">Organization details</h3>
                  <p className="mt-2 text-sm text-muted">
                    {selected.category || 'General'}
                  </p>
                  {selected.contactEmail && (
                    <a
                      className="mt-1 block text-sm text-accent"
                      href={`mailto:${selected.contactEmail}`}
                    >
                      {selected.contactEmail}
                    </a>
                  )}
                  {selected.link && (
                    <a
                      className="mt-1 block text-sm text-accent"
                      href={selected.link}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Supporting link ↗
                    </a>
                  )}
                </div>
                {selected.additionalDocuments?.map((document) => (
                  <a
                    key={document._id || document.link}
                    href={document.link}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-sm font-semibold text-accent"
                  >
                    {document.name} ↗
                  </a>
                ))}
                <p className="border-t border-line pt-4 text-xs text-muted">
                  Submitted {new Date(selected.createdAt).toLocaleString()}
                </p>
              </div>
              {selected.status === 'pending' && (
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button
                    className={secondaryClass}
                    disabled={reviewing}
                    onClick={() => void review('denied')}
                  >
                    Deny application
                  </button>
                  <button
                    className={buttonClass}
                    disabled={reviewing}
                    onClick={() => void review('approved')}
                  >
                    {reviewing ? 'Saving…' : 'Approve club'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mt-5 flex flex-wrap gap-2">
                <label className="relative min-w-56 flex-1">
                  <span className="sr-only">Search applications</span>
                  <input
                    className={inputClass}
                    type="search"
                    placeholder="Search applications"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
                <select
                  className={`${inputClass} sm:w-52`}
                  aria-label="Application status"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="denied">Denied</option>
                </select>
              </div>
              {matchingApplications.length ? (
                <ul className={`${panelClass} mt-4 divide-y divide-line`}>
                  {matchingApplications.map((application) => (
                    <li key={application._id}>
                      <button
                        type="button"
                        onClick={() => setSelected(application)}
                        className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-paper"
                      >
                        <span className="min-w-0">
                          <span className="block font-semibold">
                            {application.organizationName}
                          </span>
                          <span className="mt-1 block text-sm text-muted">
                            {typeof application.userId === 'string'
                              ? application.status
                              : `${application.userId.firstName} ${application.userId.lastName} · ${application.status}`}
                          </span>
                        </span>
                        <Icon name="arrow" size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={`${panelClass} mt-4 p-5 text-sm text-muted`}>
                  No organization applications yet.
                </p>
              )}
            </>
          )}
        </section>
      )}
      {!loading && activeTab === 'organizations' && (
        <section>
          <h1 className="text-3xl font-semibold tracking-tight">
            Organizations
          </h1>
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
                  {
                    label: 'Officers',
                    value: organizationStats.details.roles.officer || 0,
                  },
                  {
                    label: 'Regular members',
                    value: organizationStats.details.roles.student || 0,
                  },
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
                          {organization.description ||
                            'No description provided.'}
                        </span>
                      </span>
                      <span className="flex flex-wrap gap-2">
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
      )}
      {!loading && activeTab === 'statistics' && (
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
          <h2 className="mt-8 mb-3 text-xl font-semibold">
            Organization activity
          </h2>
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
      )}
    </Workspace>
  )
}
