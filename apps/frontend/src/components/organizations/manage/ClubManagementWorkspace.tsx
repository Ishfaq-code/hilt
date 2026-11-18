import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOrganizationManagement } from '../../../hooks/useOrganizationManagement'
import { isEventInProgress } from '../../../lib/events'
import type { ClubPermission } from '../../../types/clubRoles'
import type { ManagedEvent } from '../../../types/management'
import { AttendanceDialog } from '../../events/AttendanceDialog'
import { Workspace } from '../../layout/Workspace'
import { ClubRoles } from '../../roles/ClubRoles'
import { ClubPreview } from '../ClubPreview'
import { ManagedClubEvents } from '../ManagedClubEvents'
import { OrganizationInfo } from '../OrganizationInfo'
import { OrganizationMembers } from '../OrganizationMembers'
import { ClubOverview } from './ClubOverview'

const sections = [
  {
    key: 'overview',
    label: 'Overview',
    permissions: ['members', 'events', 'attendance'],
  },
  { key: 'info', label: 'Info', permissions: ['settings'] },
  { key: 'events', label: 'Events', permissions: ['events', 'attendance'] },
  { key: 'members', label: 'Members', permissions: ['members'] },
  { key: 'roles', label: 'Roles', permissions: ['roles'] },
] as const satisfies ReadonlyArray<{
  key: string
  label: string
  permissions: readonly ClubPermission[]
}>

export function ClubManagementWorkspace({
  organizationId,
  admin,
  requestedSection,
  onSectionChange,
}: {
  organizationId: string
  admin: boolean
  requestedSection: string | null
  onSectionChange: (section: string) => void
}) {
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
  const availableSections = useMemo(
    () =>
      sections.filter((section) =>
        section.permissions.some((permission) =>
          permissions.includes(permission),
        ),
      ),
    [permissions],
  )
  const firstSection = availableSections[0]?.key
  const targetSection = (
    availableSections.find(({ key }) => key === requestedSection) ??
    availableSections[0]
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

  const active =
    availableSections.find((tab) => tab.key === activeSection) ??
    availableSections[0]
  const back = admin
    ? { title: 'Back to overview', to: '/admin?tab=overview' }
    : { title: 'Back to my clubs', to: '/my-organizations' }
  const nav = availableSections.map(({ key, label }) => ({
    title: label,
    onClick: () => {
      if (targetSection === key) scrollToSection(scrollPane.current, key)
      onSectionChange(key)
    },
  }))

  const content = {
    overview: (
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
    ),
    info: (
      <OrganizationInfo
        organization={organization}
        saveOrganization={management.saveOrganization}
        saving={management.saving}
      />
    ),
    events: (
      <ManagedClubEvents
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
    ),
    members: (
      <OrganizationMembers
        matchingMembers={management.matchingMembers}
        query={management.query}
        setQuery={management.setQuery}
        updateMember={management.updateMember}
        removeMember={management.removeMember}
        permissions={permissions}
      />
    ),
    roles: (
      <ClubRoles
        roles={management.roles}
        members={management.members}
        permissions={permissions}
        history={management.history}
        save={management.saveRole}
        remove={management.deleteRole}
        undo={management.undoRole}
      />
    ),
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
      <div
        ref={attachScrollPane}
        role="region"
        aria-label="Club management sections"
        tabIndex={0}
        className="relative space-y-12 tall:h-full tall:overflow-y-auto tall:overscroll-contain tall:pr-3 tall:[&>[data-section]:last-child]:min-h-full"
      >
        {availableSections.map(({ key }) => (
          <div key={key} data-section={key}>
            {content[key]}
          </div>
        ))}
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
        <ClubPreview
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
