import { lazy, Suspense, useState } from 'react'
import {
  Navigate,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { Workspace } from '../components/layout/Workspace'
import { ClubPreviewDialog } from '../components/organizations/ClubPreviewDialog'
import { OrganizationEvents } from '../components/organizations/OrganizationEvents'
import { OrganizationInfo } from '../components/organizations/OrganizationInfo'
import { OrganizationMembers } from '../components/organizations/OrganizationMembers'
import { ClubRoles } from '../components/roles/ClubRoles'
import { useSiteSession } from '../hooks/useCurrentUser'
import { useOrganizationManagement } from '../hooks/useOrganizationManagement'
import { authEntry } from '../lib/authFlow'
import type { ClubPermission } from '../types/clubRoles'

const OrganizationStatistics = lazy(() =>
  import('../components/organizations/OrganizationStatistics').then(
    (module) => ({ default: module.OrganizationStatistics }),
  ),
)

const tabs = [
  {
    key: 'overview',
    label: 'Overview',
    permissions: ['members', 'events', 'attendance'],
  },
  { key: 'info', label: 'Info', permissions: ['settings'] },
  { key: 'events', label: 'Events', permissions: ['events', 'attendance'] },
  { key: 'members', label: 'Members', permissions: ['members'] },
  { key: 'roles', label: 'Roles', permissions: ['roles'] },
] satisfies { key: string; label: string; permissions: ClubPermission[] }[]

export default function OrganizationManagePage({
  admin = false,
}: {
  admin?: boolean
}) {
  const { organizationId = '' } = useParams()
  const location = useLocation()
  const { user, token } = useSiteSession()

  if (!token) return <Navigate {...authEntry('login', {})} />
  if (!user?.role)
    return (
      <p className="mx-auto max-w-6xl px-4 pt-10 text-sm text-muted">
        Loading account…
      </p>
    )
  if (user.role === 'admin' && !admin)
    return <Navigate to="/admin?tab=overview" replace />
  if (user.role !== 'admin' && admin)
    return (
      <Navigate
        to={'/organizations/' + organizationId + '/manage' + location.search}
        replace
      />
    )

  return (
    <OrganizationManagementWorkspace
      key={organizationId}
      organizationId={organizationId}
      admin={admin}
    />
  )
}

function OrganizationManagementWorkspace({
  organizationId,
  admin,
}: {
  organizationId: string
  admin: boolean
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [previewOpen, setPreviewOpen] = useState(false)
  const management = useOrganizationManagement(organizationId, admin)
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
  const requestedTab =
    searchParams.get('tab') === 'statistics'
      ? 'overview'
      : searchParams.get('tab')
  const active = visible.find((tab) => tab.key === requestedTab) ?? visible[0]
  const back = admin
    ? { title: 'Back to overview', to: '/admin?tab=overview' }
    : { title: 'Back to my clubs', to: '/my-organizations' }
  const nav = visible.map(({ key, label }) => ({
    title: label,
    onClick: () => {
      const next = new URLSearchParams(searchParams)
      next.set('tab', key)
      setSearchParams(next)
    },
  }))

  return (
    <Workspace
      title={organization.name}
      nav={nav}
      active={active?.label ?? ''}
      back={back}
      action={
        <button
          type="button"
          aria-haspopup="dialog"
          className="cursor-pointer text-sm text-muted hover:text-ink"
          onClick={() => setPreviewOpen(true)}
        >
          Preview club
        </button>
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
          onOpenClub={() => setPreviewOpen(true)}
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
      {active?.key === 'overview' && (
        <Suspense
          fallback={<p className="text-sm text-muted">Loading charts…</p>}
        >
          <OrganizationStatistics statistics={management.statistics} />
        </Suspense>
      )}
      {previewOpen && (
        <ClubPreviewDialog
          clubId={organizationId}
          initialClub={organization}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </Workspace>
  )
}
