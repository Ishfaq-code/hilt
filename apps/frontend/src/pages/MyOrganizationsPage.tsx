import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { JoinedOrganizationDetails } from '../components/organizations/JoinedOrganizationDetails'
import { OrganizationSidebar } from '../components/organizations/OrganizationSidebar'
import { panelClass } from '../components/ui/styles'
import { api } from '../lib/api'
import type { Organization } from '../types'

type Membership = {
  _id: string
  organizationRole: string
  organizationId: Organization
}

export default function MyOrganizationsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Membership[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [tab, setTab] = useState<'Home' | 'Events'>('Home')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!sessionStorage.getItem('authToken')) {
      navigate('/login', {
        replace: true,
        state: { from: '/my-organizations' },
      })
      return
    }
    let active = true
    api<Membership[]>('/api/memberships/mine')
      .then((memberships) => {
        if (active) {
          setItems(memberships)
          setSelectedId(memberships[0]?.organizationId?._id || '')
        }
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : 'Unable to load your organizations.',
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [navigate])
  const organizations = items.map((membership) => ({
    ...membership.organizationId,
    _membershipRole: membership.organizationRole,
  }))
  const selected = organizations.find(
    (organization) => organization._id === selectedId,
  )

  return (
    <div className="mx-auto max-w-6xl px-4 pt-9 sm:px-8 sm:pt-13">
      <h1 className="mb-6 text-4xl font-semibold tracking-tight sm:text-5xl">
        My clubs
      </h1>
      {loading && (
        <p className="text-sm text-muted">Loading your organizations…</p>
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
            onHome={() => setSelectedId('')}
            onSelect={(id) => {
              setSelectedId(id)
              setTab('Home')
            }}
          />
          <section className="min-w-0">
            {selected ? (
              <JoinedOrganizationDetails
                selected={selected}
                tab={tab}
                setTab={setTab}
              />
            ) : (
              <div className={`${panelClass} p-6 sm:p-8`}>
                <h2 className="text-2xl font-semibold tracking-tight">
                  Your organization home
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Clubs you join will appear here. Find a community that
                  interests you and stay up to date with its information and
                  events.
                </p>
                <Link
                  className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-ink bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-active"
                  to="/"
                >
                  Find organizations
                </Link>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
