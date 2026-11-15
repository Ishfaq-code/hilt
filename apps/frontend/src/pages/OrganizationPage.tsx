import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { OrganizationEventList } from '../components/events/OrganizationEventList'
import { Cover } from '../components/organizations/Cover'
import { OrganizationAvatar } from '../components/organizations/OrganizationAvatar'
import { OrganizationSummary } from '../components/organizations/OrganizationSummary'
import ActionButton from '../components/ui/ActionButton'
import { Icon } from '../components/ui/Icon'
import { panelClass, secondaryClass } from '../components/ui/styles'
import { Tabs } from '../components/ui/Tabs'
import { api } from '../lib/api'
import type { Organization } from '../types'

type MemberItem = {
  organizationId: { _id: string }
  organizationRole: 'student' | 'officer' | 'owner'
}

export default function OrganizationPage() {
  const { organizationId = '' } = useParams()
  const navigate = useNavigate()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [memberRole, setMemberRole] = useState<
    'student' | 'officer' | 'owner' | null
  >(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'Home' | 'Events'>('Home')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [now] = useState(() => Date.now())

  useEffect(() => {
    let active = true
    Promise.all([
      api<Organization>(`/api/organizations/${organizationId}`),
      sessionStorage.getItem('authToken')
        ? api<MemberItem[]>('/api/memberships/mine').catch(() => [])
        : Promise.resolve([]),
    ])
      .then(([item, memberships]) => {
        if (active) {
          setOrganization(item)
          const membership = memberships.find(
            (entry) => entry.organizationId?._id === organizationId,
          )
          setIsMember(Boolean(membership))
          setMemberRole(membership?.organizationRole || null)
        }
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : 'Organization not found.',
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [organizationId])

  async function join() {
    if (!sessionStorage.getItem('authToken')) {
      navigate('/login', {
        state: { from: `/organizations/${organizationId}` },
      })
      return
    }
    setBusy(true)
    setMessage('')
    try {
      await api('/api/memberships', {
        method: 'POST',
        body: JSON.stringify({ organizationId }),
      })
      const updated = await api<Organization>(
        `/api/organizations/${organizationId}`,
      )
      setOrganization(updated)
      setIsMember(true)
      setMemberRole('student')
      setMessage('You are now a member of this organization.')
    } catch (cause) {
      setMessage(
        cause instanceof Error
          ? cause.message
          : 'Unable to join this organization.',
      )
    } finally {
      setBusy(false)
    }
  }

  if (loading)
    return (
      <div className="mx-auto max-w-5xl px-4 pt-9 sm:px-8">
        <p className="text-sm text-muted">Loading organization…</p>
      </div>
    )
  if (!organization)
    return (
      <div className="mx-auto max-w-5xl px-4 pt-9 sm:px-8">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted"
        >
          <Icon name="back" size={15} />
          Discover organizations
        </Link>
        <h1 className="text-3xl font-semibold">
          {error || 'Organization not found'}
        </h1>
      </div>
    )
  const events = [...(organization.events || [])].sort(
    (a, b) => Date.parse(a.startDatetime) - Date.parse(b.startDatetime),
  )
  const upcoming = events.find(
    (event) => Date.parse(event.startDatetime) >= now,
  )
  const manage = (
    <Link
      to={`/organizations/${organizationId}/manage`}
      className={secondaryClass}
    >
      Manage
    </Link>
  )

  return (
    <div className="mx-auto max-w-5xl px-4 pt-7 sm:px-8">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"
      >
        <Icon name="back" size={15} />
        Discover organizations
      </Link>
      <article className={`${panelClass} overflow-hidden`}>
        <Cover organization={organization} large />
        <div className="relative px-5 pb-0 sm:px-8">
          <OrganizationAvatar
            organization={organization}
            className="-mt-7 size-15 text-lg"
          />
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-1 text-sm font-semibold text-accent">
                {organization.category || 'Student organization'}
              </p>
              <h1 className="text-4xl font-semibold tracking-tight">
                {organization.name}
              </h1>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-3">
              {memberRole === 'officer' || memberRole === 'owner' ? (
                manage
              ) : isMember ? (
                <span className="rounded-lg border border-line bg-paper px-3 py-2 text-sm font-medium capitalize text-muted">
                  {memberRole === 'student' ? 'Member' : 'Member'}
                </span>
              ) : (
                <ActionButton onClick={() => void join()} disabled={busy}>
                  {busy ? 'Joining…' : 'Join organization'}
                </ActionButton>
              )}
            </div>
          </div>
          {message && (
            <p role="status" className="mt-3 text-sm text-muted">
              {message}
            </p>
          )}
          <div className="mt-4">
            <Tabs
              label="Organization navigation"
              active={tab}
              items={(['Home', 'Events'] as const).map((title) => ({
                title,
                onClick: () => setTab(title),
              }))}
            />
          </div>
          {tab === 'Events' ? (
            <OrganizationEventList events={events} />
          ) : (
            <OrganizationSummary
              organization={organization}
              upcoming={upcoming}
              eventCount={events.length}
              onShowEvents={() => setTab('Events')}
            />
          )}
        </div>
      </article>
    </div>
  )
}
