import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ActionButton from '../components/atoms/ActionButton'
import { Cover, Icon, OrganizationAvatar, panelClass, secondaryClass, Tabs } from '../components/wireframe/Design'
import { api } from '../lib/api'
import type { Organization } from '../types'

type MemberItem = { organizationId: { _id: string }; organizationRole: 'student' | 'officer' | 'owner' }

export default function OrganizationPage() {
  const { organizationId = '' } = useParams()
  const navigate = useNavigate()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [memberRole, setMemberRole] = useState<'student' | 'officer' | 'owner' | null>(null)
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
      sessionStorage.getItem('authToken') ? api<MemberItem[]>('/api/memberships/mine').catch(() => []) : Promise.resolve([]),
    ]).then(([item, memberships]) => {
      if (active) { setOrganization(item); const membership = memberships.find((entry) => entry.organizationId?._id === organizationId); setIsMember(Boolean(membership)); setMemberRole(membership?.organizationRole || null) }
    }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Organization not found.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [organizationId])
  async function join() {
    if (!sessionStorage.getItem('authToken')) { navigate('/login', { state: { from: `/organizations/${organizationId}` } }); return }
    setBusy(true); setMessage('')
    try { await api('/api/memberships', { method: 'POST', body: JSON.stringify({ organizationId }) }); const updated = await api<Organization>(`/api/organizations/${organizationId}`); setOrganization(updated); setIsMember(true); setMemberRole('student'); setMessage('You are now a member of this organization.') }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Unable to join this organization.') }
    finally { setBusy(false) }
  }
  if (loading) return <div className="mx-auto max-w-5xl px-4 pt-9 sm:px-8"><p className="text-sm text-muted">Loading organization…</p></div>
  if (!organization) return <div className="mx-auto max-w-5xl px-4 pt-9 sm:px-8"><Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted"><Icon name="back" size={15} />Discover organizations</Link><h1 className="text-3xl font-semibold">{error || 'Organization not found'}</h1></div>
  const events = [...(organization.events || [])].sort((a, b) => Date.parse(a.startDatetime) - Date.parse(b.startDatetime))
  const upcoming = events.find((event) => Date.parse(event.startDatetime) >= now)
  const manage = <Link to={`/organizations/${organizationId}/manage`} className={secondaryClass}>Manage</Link>
  return <div className="mx-auto max-w-5xl px-4 pt-7 sm:px-8"><Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"><Icon name="back" size={15} />Discover organizations</Link>
    <article className={`${panelClass} overflow-hidden`}>
      <Cover organization={organization} large />
      <div className="relative px-5 pb-0 sm:px-8"><OrganizationAvatar organization={organization} className="-mt-7 size-15 text-lg" />
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-sm font-semibold text-accent">{organization.category || 'Student organization'}</p><h1 className="text-4xl font-semibold tracking-tight">{organization.name}</h1></div><div className="ml-auto flex flex-wrap items-center gap-3">{memberRole === 'officer' || memberRole === 'owner' ? manage : isMember ? <span className="rounded-lg border border-line bg-paper px-3 py-2 text-sm font-medium capitalize text-muted">{memberRole === 'student' ? 'Member' : 'Member'}</span> : <ActionButton onClick={() => void join()} disabled={busy}>{busy ? 'Joining…' : 'Join organization'}</ActionButton>}</div></div>
        {message && <p role="status" className="mt-3 text-sm text-muted">{message}</p>}
        <div className="mt-4"><Tabs label="Organization navigation" active={tab} items={(['Home', 'Events'] as const).map((title) => ({ title, onClick: () => setTab(title) }))} /></div>
        {tab === 'Events' ? <div className="py-5">{events.length ? <ul className="divide-y divide-line">{events.map((event) => <li key={event._id} className="flex flex-wrap items-start justify-between gap-3 py-4"><div className="flex gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-lg bg-soft text-sm font-semibold text-accent">{new Date(event.startDatetime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span><div><h2 className="font-semibold">{event.name}</h2><p className="mt-1 text-sm text-muted">{new Date(event.startDatetime).toLocaleString()} – {new Date(event.endDatetime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>{event.place && <p className="mt-1 flex items-center gap-1 text-sm text-muted"><Icon name="pin" size={14} />{event.place}</p>}{event.description && <p className="mt-2 text-sm leading-relaxed text-muted">{event.description}</p>}</div></div><span className="rounded bg-paper px-2 py-1 text-xs text-muted">{event.type || 'Event'}</span></li>)}</ul> : <p className="py-4 text-sm text-muted">No events have been scheduled yet.</p>}</div> : <div className="grid gap-6 py-6 sm:grid-cols-[2fr_1fr]"><section><h2 className="mb-3 text-xl font-semibold">Next up</h2>{upcoming ? <div className={panelClass}><div className="p-4"><p className="mb-1 text-sm font-semibold text-accent">{new Date(upcoming.startDatetime).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p><h3 className="text-lg font-semibold">{upcoming.name}</h3><p className="mt-1 text-sm text-muted">{new Date(upcoming.startDatetime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}{upcoming.place ? ` · ${upcoming.place}` : ''}</p>{upcoming.description && <p className="mt-3 text-sm leading-relaxed text-muted">{upcoming.description}</p>}</div></div> : <p className="text-sm text-muted">No upcoming events.</p>}{events.length > (upcoming ? 1 : 0) && <button type="button" onClick={() => setTab('Events')} className="mt-3 inline-block text-sm font-semibold text-accent hover:underline">All organization events →</button>}</section><section><h2 className="mb-3 text-xl font-semibold">About</h2><p className="text-sm leading-relaxed text-muted">{organization.description || 'Learn more about this organization and connect with its members.'}</p><p className="mt-4 text-sm text-muted">Membership dues: {organization.membershipFee ? `$${organization.membershipFee}` : 'Free'}</p>{organization.profile && <a href={organization.profile} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">Organization website <Icon name="arrow" size={14} /></a>}</section></div>}
      </div>
    </article>
  </div>
}
