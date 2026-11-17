import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react'
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
  const [activeSection, setActiveSection] = useState('')
  const scrollPane = useRef<HTMLDivElement>(null)
  const management = useOrganizationManagement(organizationId, admin)
  const { organization, loading, error, permissions } = management
  const visible = useMemo(
    () =>
      tabs.filter((tab) =>
        tab.permissions.some((permission) => permissions.includes(permission)),
      ),
    [permissions],
  )
  const requestedSection = searchParams.get('tab')
  const targetSection = (
    visible.find(({ key }) => key === requestedSection) ?? visible[0]
  )?.key

  const attachScrollPane = useCallback(
    (pane: HTMLDivElement | null) => {
      scrollPane.current = pane
      if (targetSection) scrollToSection(pane, targetSection)
    },
    [targetSection],
  )

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

  const active = visible.find((tab) => tab.key === activeSection) ?? visible[0]
  const back = admin
    ? { title: 'Back to overview', to: '/admin?tab=overview' }
    : { title: 'Back to my clubs', to: '/my-organizations' }
  const nav = visible.map(({ key, label }) => ({
    title: label,
    onClick: () => {
      if (targetSection === key) scrollToSection(scrollPane.current, key)
      const next = new URLSearchParams(searchParams)
      next.set('tab', key)
      setSearchParams(next, { replace: true })
    },
  }))

  function updateActiveSection() {
    const pane = scrollPane.current
    if (!pane) return
    const sections = [...pane.querySelectorAll<HTMLElement>('[data-section]')]
    const current = sections
      .filter((section) => section.offsetTop <= pane.scrollTop + 80)
      .at(-1)
    const atBottom = pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 2
    const selected = atBottom ? sections.at(-1) : current
    setActiveSection(selected?.dataset.section ?? visible[0]?.key ?? '')
  }

  return (
    <Workspace
      title={organization.name}
      nav={nav}
      active={active?.label ?? ''}
      back={back}
      scrollable
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
      <Suspense fallback={<p className="text-sm text-muted">Loading club…</p>}>
        <div
          ref={attachScrollPane}
          role="region"
          aria-label="Club management sections"
          tabIndex={0}
          onScroll={updateActiveSection}
          className="relative h-full space-y-12 overflow-y-auto overscroll-contain pr-3 [&>[data-section]:last-child]:min-h-full"
        >
          {visible.some(({ key }) => key === 'overview') && (
            <div data-section="overview">
              <OrganizationStatistics statistics={management.statistics} />
            </div>
          )}
          {permissions.includes('settings') && (
            <div data-section="info">
              <OrganizationInfo
                organization={organization}
                saveOrganization={management.saveOrganization}
                saving={management.saving}
              />
            </div>
          )}
          {(permissions.includes('events') ||
            permissions.includes('attendance')) && (
            <div data-section="events">
              <OrganizationEvents
                club={organization}
                events={management.events}
                canEdit={permissions.includes('events')}
                canCheckIn={permissions.includes('attendance')}
                onOpenClub={() => setPreviewOpen(true)}
                saved={management.saved}
                deleteEvent={management.deleteEvent}
              />
            </div>
          )}
          {permissions.includes('members') && (
            <div data-section="members">
              <OrganizationMembers
                matchingMembers={management.matchingMembers}
                query={management.query}
                setQuery={management.setQuery}
                updateMember={management.updateMember}
                removeMember={management.removeMember}
                permissions={permissions}
              />
            </div>
          )}
          {permissions.includes('roles') && (
            <div data-section="roles">
              <ClubRoles
                roles={management.roles}
                members={management.members}
                permissions={permissions}
                history={management.history}
                save={management.saveRole}
                remove={management.deleteRole}
                undo={management.undoRole}
              />
            </div>
          )}
        </div>
      </Suspense>
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

function scrollToSection(pane: HTMLDivElement | null, key: string) {
  const section = pane?.querySelector<HTMLElement>(`[data-section="${key}"]`)
  if (!pane || !section) return
  pane.scrollTo({
    top: section.offsetTop,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'instant'
      : 'smooth',
  })
}
