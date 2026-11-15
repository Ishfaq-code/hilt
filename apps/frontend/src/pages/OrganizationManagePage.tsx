import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Workspace } from '../components/layout/Workspace'
import { OrganizationEvents } from '../components/organizations/OrganizationEvents'
import { OrganizationInfo } from '../components/organizations/OrganizationInfo'
import { OrganizationMembers } from '../components/organizations/OrganizationMembers'
import { ClubRoles } from '../components/roles/ClubRoles'
import { useOrganizationManagement } from '../hooks/useOrganizationManagement'
import type { ClubPermission } from '../types/clubRoles'

const tabs = [
  { key: 'info', label: 'Info', permissions: ['settings'] },
  { key: 'events', label: 'Events', permissions: ['events', 'attendance'] },
  { key: 'pages', label: 'Pages', permissions: ['editPages', 'publishPages'] },
  { key: 'members', label: 'Members', permissions: ['members'] },
  { key: 'roles', label: 'Roles', permissions: ['roles'] },
  {
    key: 'statistics',
    label: 'Statistics',
    permissions: ['events', 'attendance'],
  },
] satisfies { key: string; label: string; permissions: ClubPermission[] }[]

export default function OrganizationManagePage() {
  const { organizationId = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const management = useOrganizationManagement(organizationId)
  const { organization, loading, error, permissions } = management

  if (loading) {
    return (
      <p className="mx-auto max-w-6xl px-4 pt-10 text-sm text-muted">
        Loading club…
      </p>
    )
  }
  if (!organization) {
    return (
      <p
        role="alert"
        className="mx-auto max-w-6xl px-4 pt-10 text-sm text-red-700"
      >
        {error || 'Club not found.'}
      </p>
    )
  }

  const visible = tabs.filter((tab) =>
    tab.permissions.some((permission) => permissions.includes(permission)),
  )
  const active =
    visible.find((tab) => tab.key === searchParams.get('tab')) ?? visible[0]
  const nav = visible.map(({ key, label }) => ({
    title: label,
    onClick: () => setSearchParams({ tab: key }),
  }))

  return (
    <Workspace
      title={organization.name}
      nav={nav}
      active={active?.label ?? ''}
      back={{
        title: 'Back to my clubs',
        onClick: () => navigate('/my-organizations'),
      }}
      action={
        <Link
          to={'/organizations/' + organizationId}
          className="text-sm text-muted hover:text-ink"
        >
          Preview club <span aria-hidden="true">→</span>
        </Link>
      }
    >
      {!active && (
        <p className="text-sm text-muted">
          No management tools are available for your permissions.
        </p>
      )}
      {active?.key === 'info' && (
        <OrganizationInfo
          organization={organization}
          saveOrganization={management.saveOrganization}
          saving={management.saving}
        />
      )}
      {active?.key === 'events' && (
        <OrganizationEvents
          club={organization}
          events={management.events}
          canEdit={permissions.includes('events')}
          canCheckIn={permissions.includes('attendance')}
          saved={management.saved}
          deleteEvent={management.deleteEvent}
        />
      )}
      {active?.key === 'members' && (
        <OrganizationMembers
          matchingMembers={management.matchingMembers}
          query={management.query}
          setQuery={management.setQuery}
          updateMember={management.updateMember}
          removeMember={management.removeMember}
          permissions={permissions}
        />
      )}
      {active?.key === 'roles' && (
        <ClubRoles
          roles={management.roles}
          members={management.members}
          permissions={permissions}
          history={management.history}
          save={management.saveRole}
          remove={management.deleteRole}
          undo={management.undoRole}
        />
      )}
      {(active?.key === 'statistics' || active?.key === 'pages') && (
        <section>
          <h1 className="mb-3 text-3xl font-semibold tracking-tight">
            {active.label}
          </h1>
          <p className="text-sm text-muted">Under construction</p>
        </section>
      )}
    </Workspace>
  )
}
