import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Navigate,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { AttendanceDialog } from '../components/events/AttendanceDialog'
import { Workspace } from '../components/layout/Workspace'
import { ClubPreviewDialog } from '../components/organizations/ClubPreviewDialog'
import { OrganizationEvents } from '../components/organizations/OrganizationEvents'
import { OrganizationInfo } from '../components/organizations/OrganizationInfo'
import { OrganizationMembers } from '../components/organizations/OrganizationMembers'
import { ClubOverview } from '../components/organizations/manage/ClubOverview'
import { ClubRoles } from '../components/roles/ClubRoles'
import { useSiteSession } from '../hooks/useCurrentUser'
import { useOrganizationManagement } from '../hooks/useOrganizationManagement'
import { authEntry } from '../lib/authFlow'
import { isEventInProgress } from '../lib/events'
import type { ClubPermission } from '../types/clubRoles'
import type { ManagedEvent } from '../types/management'

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
  const [attendanceEvent, setAttendanceEvent] = useState<ManagedEvent | null>(
    null,
  )
  const [now, setNow] = useState(Date.now)
  const scrollPane = useRef<HTMLDivElement>(null)
  const management = useOrganizationManagement(organizationId, admin)
  const { organization, loading, error, permissions } = management
  const canCheckIn = permissions.includes('attendance')
  const liveEvent = canCheckIn
    ? management.events.find(
        (event) => event.status !== 'draft' && isEventInProgress(event, now),
      )
    : undefined
  const visible = useMemo(
    () =>
      tabs.filter((tab) =>
        tab.permissions.some((permission) => permissions.includes(permission)),
      ),
    [permissions],
  )
  const requestedSection = searchParams.get('tab')
  const firstSection = visible[0]?.key
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

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    function updateActiveSection(event: Event) {
      const pane = scrollPane.current
      if (!pane) return
      const root = scrollRoot(pane)
      if (!root || event.target !== (root === pane ? pane : document)) return

      const sections = [...pane.querySelectorAll<HTMLElement>('[data-section]')]
      const viewportTop = root === pane ? pane.getBoundingClientRect().top : 0
      const current = sections.findLast(
        (section) => section.getBoundingClientRect().top <= viewportTop + 80,
      )
      const atBottom =
        root.scrollTop + root.clientHeight >= root.scrollHeight - 2
      const selected = atBottom ? sections.at(-1) : current
      setActiveSection(selected?.dataset.section ?? firstSection ?? '')
    }

    document.addEventListener('scroll', updateActiveSection, {
      capture: true,
      passive: true,
    })
    return () =>
      document.removeEventListener('scroll', updateActiveSection, true)
  }, [firstSection])

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
      <div
        ref={attachScrollPane}
        role="region"
        aria-label="Club management sections"
        tabIndex={0}
        className="relative space-y-12 tall:h-full tall:overflow-y-auto tall:overscroll-contain tall:pr-3 tall:[&>[data-section]:last-child]:min-h-full"
      >
        {visible.some(({ key }) => key === 'overview') && (
          <div data-section="overview">
            <ClubOverview
              statistics={management.statistics}
              checkIn={
                liveEvent && liveEvent.status !== 'draft'
                  ? {
                      eventName: liveEvent.name,
                      onClick: () => setAttendanceEvent(liveEvent),
                    }
                  : undefined
              }
            />
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
              totals={management.statistics?.eventAttendance}
              canEdit={permissions.includes('events')}
              now={now}
              onAttendance={canCheckIn ? setAttendanceEvent : undefined}
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
      {canCheckIn && attendanceEvent && (
        <AttendanceDialog
          club={organization}
          event={attendanceEvent}
          onClose={() => setAttendanceEvent(null)}
          onTotalsChange={management.updateEventTotals}
        />
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

function scrollToSection(pane: HTMLDivElement | null, key: string) {
  const section = pane?.querySelector<HTMLElement>(`[data-section="${key}"]`)
  if (!pane || !section) return
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'instant'
    : 'smooth'
  if (scrollRoot(pane) === pane)
    pane.scrollTo({ top: section.offsetTop, behavior })
  else section.scrollIntoView({ behavior })
}

function scrollRoot(pane: HTMLDivElement) {
  return getComputedStyle(pane).overflowY === 'auto'
    ? pane
    : document.scrollingElement
}
