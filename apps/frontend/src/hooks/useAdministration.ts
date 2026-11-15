import { useToast } from './useToast'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import type { Application } from '../types'
import type {
  AdminOrganization,
  OrgStats,
  Stats,
} from '../types/administration'

const nav = [
  { key: 'overview', label: 'Overview' },
  { key: 'applications', label: 'Applications' },
  { key: 'organizations', label: 'Organizations' },
  { key: 'reports', label: 'Event reports' },
  { key: 'statistics', label: 'Statistics' },
] as const

type Tab = (typeof nav)[number]['key']

export function useAdministration() {
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('tab') || 'overview'
  const activeTab: Tab = nav.some((item) => item.key === requested)
    ? (requested as Tab)
    : 'overview'
  const [stats, setStats] = useState<Stats | null>(null)
  const [organizations, setOrganizations] = useState<AdminOrganization[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [error, setError] = useState('')
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
      toast({
        title:
          status === 'approved'
            ? `${updated.organizationName} was approved.`
            : `${updated.organizationName} was denied.`,
      })
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
    try {
      await api(`/api/organizations/${organization._id}`, { method: 'DELETE' })
      setOrganizations((items) =>
        items.filter((item) => item._id !== organization._id),
      )
      await load()
      toast({ title: `${organization.name} was removed.` })
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
    [organization.name, organization.description, ...organization.tags]
      .join(' ')
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

  const activeLabel =
    nav.find((item) => item.key === activeTab)?.label || 'Overview'
  return {
    activeLabel,
    activeTab,
    workspaceNav,
    loading,
    error,
    stats,
    setSearchParams,
    selected,
    setSelected,
    reviewing,
    review,
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    matchingApplications,
    organizationStats,
    setOrganizationStats,
    matchingOrganizations,
    statsLoading,
    showStatistics,
    moderate,
    organizations,
  }
}

export type Administration = ReturnType<typeof useAdministration>
