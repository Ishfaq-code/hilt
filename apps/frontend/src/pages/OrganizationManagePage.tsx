import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Workspace } from '../components/layout/Workspace'
import { OrganizationEvents } from '../components/organizations/OrganizationEvents'
import { OrganizationInfo } from '../components/organizations/OrganizationInfo'
import { OrganizationMembers } from '../components/organizations/OrganizationMembers'
import { useOrganizationManagement } from '../hooks/useOrganizationManagement'

const tabs = [
  { key: 'info', label: 'Info' },
  { key: 'events', label: 'Events' },
  { key: 'members', label: 'Members' },
  { key: 'statistics', label: 'Statistics' },
  { key: 'pages', label: 'Pages' },
] as const

type TabKey = (typeof tabs)[number]['key']

export default function OrganizationManagePage() {
  const { organizationId = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab') || 'info'
  const activeTab: TabKey = tabs.some((item) => item.key === rawTab)
    ? (rawTab as TabKey)
    : 'info'
  const management = useOrganizationManagement(organizationId)
  const { organization, loading, error } = management

  if (loading)
    return (
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-8">
        <p className="text-sm text-muted">Loading organization workspace…</p>
      </div>
    )
  if (!organization)
    return (
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-8">
        <p role="alert" className="text-sm text-red-700">
          {error || 'Organization not found.'}
        </p>
      </div>
    )
  const nav = tabs.map((item) => ({
    title: item.label,
    onClick: () => setSearchParams({ tab: item.key }),
  }))

  return (
    <Workspace
      title={organization.name}
      nav={nav}
      active={tabs.find((item) => item.key === activeTab)?.label || 'Info'}
      back={{
        title: 'Back to my clubs',
        onClick: () => navigate('/my-organizations'),
      }}
      action={
        <Link
          to={`/organizations/${organizationId}`}
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink"
        >
          View organization <span aria-hidden="true">→</span>
        </Link>
      }
    >
      {error && (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {error}
        </p>
      )}
      {activeTab === 'info' && (
        <OrganizationInfo
          organization={organization}
          saveOrganization={management.saveOrganization}
        />
      )}
      {activeTab === 'events' && (
        <OrganizationEvents
          club={organization}
          events={management.events}
          saved={management.saved}
          deleteEvent={management.deleteEvent}
        />
      )}
      {activeTab === 'members' && (
        <OrganizationMembers
          matchingMembers={management.matchingMembers}
          query={management.query}
          setQuery={management.setQuery}
          updateMember={management.updateMember}
          removeMember={management.removeMember}
          actorRole={management.actorRole}
        />
      )}
      {(activeTab === 'statistics' || activeTab === 'pages') && (
        <section>
          <h1 className="mb-3 text-3xl font-semibold tracking-tight">
            {activeTab === 'statistics' ? 'Statistics' : 'Pages'}
          </h1>
          <p className="text-sm text-muted">Under construction</p>
        </section>
      )}
    </Workspace>
  )
}
