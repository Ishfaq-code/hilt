import { useEffect, useState } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { EventCalendar } from '../components/events/EventCalendar'
import { JoinedOrganizationDetails } from '../components/organizations/JoinedOrganizationDetails'
import { OrganizationSidebar } from '../components/organizations/OrganizationSidebar'
import { useAuthToken } from '../hooks/useAuthToken'
import { useToast } from '../hooks/useToast'
import { api } from '../lib/api'
import { authEntry, authPath } from '../lib/authDialog'
import type { Organization } from '../types'
import type { Membership as ClubMembership } from '../types/management'

type Membership = Omit<ClubMembership, 'organizationId'> & {
  organizationId: Organization | null
}

export default function MyOrganizationsPage() {
  const location = useLocation()
  const token = useAuthToken()
  const { toast } = useToast()
  const [params, setParams] = useSearchParams()
  const requested = params.get('club')
  const [items, setItems] = useState<Membership[]>([])
  const [tab, setTab] = useState<'Home' | 'Events'>('Home')
  const [loading, setLoading] = useState(true)
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    let active = true
    api<Membership[]>('/api/memberships/mine')
      .then((memberships) => {
        if (active) {
          setItems(memberships)
        }
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : 'Couldn’t load your clubs.',
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [token])
  if (!token)
    return <Navigate {...authEntry('login', { from: authPath(location) })} />
  const organizations = items.flatMap(
    ({ _id: membershipId, organizationId, roles, permissions }) =>
      organizationId
        ? [{ ...organizationId, membershipId, roles, permissions }]
        : [],
  )
  const selectedId = requested ?? ''
  const selected = organizations.find(
    (organization) => organization._id === selectedId,
  )

  async function leaveClub(membershipId: string, club: Organization) {
    setLeaving(true)
    try {
      await api('/api/memberships/' + membershipId, { method: 'DELETE' })
      setItems((memberships) =>
        memberships.filter((membership) => membership._id !== membershipId),
      )
      if (
        window.location.pathname === location.pathname &&
        new URLSearchParams(window.location.search).get('club') === club._id
      ) {
        setParams({}, { replace: true })
      }
      toast({ title: 'Club left', description: club.name })
    } catch (cause) {
      toast({
        title:
          cause instanceof Error ? cause.message : 'Couldn’t leave the club.',
        variant: 'destructive',
      })
    } finally {
      setLeaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-9 sm:px-8 sm:pt-13">
      <h1 className="mb-6 text-4xl font-semibold tracking-tight sm:text-5xl">
        My clubs
      </h1>
      {loading && (
        <p role="status" className="text-sm text-muted">
          Loading your clubs…
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-muted">
          {error}
        </p>
      )}
      {!loading && !error && (
        <div className="grid gap-4 md:grid-cols-[12rem_minmax(0,1fr)] lg:grid-cols-[13rem_minmax(0,1fr)]">
          <OrganizationSidebar
            organizations={organizations}
            selectedId={selectedId}
            hasSelected={Boolean(selected)}
            onHome={() => setParams({})}
            onSelect={(id) => {
              setParams({ club: id })
              setTab('Home')
            }}
          />
          <section className="min-w-0">
            {selected ? (
              <JoinedOrganizationDetails
                key={selected._id}
                selected={selected}
                tab={tab}
                setTab={setTab}
                leaving={leaving}
                onLeave={() => void leaveClub(selected.membershipId, selected)}
              />
            ) : (
              <EventCalendar scope="mine" />
            )}
          </section>
        </div>
      )}
    </div>
  )
}
