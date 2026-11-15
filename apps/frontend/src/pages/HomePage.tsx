import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ClubPreviewDialog } from '../components/organizations/ClubPreviewDialog'
import { OrganizationRow } from '../components/organizations/OrganizationRow'
import { Icon } from '../components/ui/Icon'
import { inputClass, panelClass } from '../components/ui/styles'
import { api } from '../lib/api'
import type { Organization } from '../types'

const categories = [
  { category: 'Outdoors', title: 'Crave the outdoors?' },
  { category: 'Technology', title: 'Techies' },
  { category: 'Arts', title: 'For the artists' },
]

export default function HomePage() {
  const [params, setParams] = useSearchParams()
  const previewId = params.get('club')
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api<Organization[]>('/api/organizations')
      .then((items) => {
        if (active) setOrganizations(items)
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : 'Unable to load organizations.',
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])
  const query = search.trim().toLowerCase()
  const filtered = organizations.filter((organization) =>
    `${organization.name} ${organization.description || ''} ${organization.category || ''}`
      .toLowerCase()
      .includes(query),
  )

  return (
    <section className="mx-auto max-w-6xl px-4 pt-9 sm:px-8 sm:pt-13">
      <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
        Find clubs and events on campus.
      </h1>
      <label className="relative mt-5 block max-w-xl">
        <span className="pointer-events-none absolute top-3.5 left-3 text-muted">
          <Icon name="search" size={17} />
        </span>
        <input
          className={`${inputClass} pl-10`}
          type="search"
          aria-label="Search clubs"
          placeholder="Search clubs"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      {loading && (
        <p className="py-8 text-sm text-muted">Loading organizations…</p>
      )}
      {error && (
        <p role="alert" className={`${panelClass} mt-4 p-5 text-sm text-muted`}>
          {error}
        </p>
      )}
      {!loading && !error && organizations.length === 0 && (
        <p className={`${panelClass} mt-5 p-6 text-sm text-muted`}>
          No organizations are listed yet.
        </p>
      )}
      {!loading && !error && organizations.length > 0 && (
        <>
          <OrganizationRow title="Popular" organizations={filtered} />
          {categories.map(({ category, title }) => {
            const matches = filtered.filter(
              (organization) =>
                (organization.category || '').toLowerCase() ===
                category.toLowerCase(),
            )
            return matches.length > 0 ? (
              <OrganizationRow
                key={category}
                title={title}
                organizations={matches}
              />
            ) : null
          })}
          {query && filtered.length === 0 && (
            <p
              role="status"
              className={`${panelClass} mt-5 p-5 text-sm text-muted`}
            >
              No organizations match your search.
            </p>
          )}
        </>
      )}
      {previewId && (
        <ClubPreviewDialog
          key={previewId}
          clubId={previewId}
          eventId={params.get('event')}
          initialClub={organizations.find((club) => club._id === previewId)}
          onClose={() => setParams({}, { replace: true })}
          onCloseEvent={() => setParams({ club: previewId }, { replace: true })}
        />
      )}
    </section>
  )
}
