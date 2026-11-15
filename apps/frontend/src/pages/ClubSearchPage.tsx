import { Link, useSearchParams } from 'react-router-dom'
import { ClubPreviewFromUrl } from '../components/organizations/ClubPreviewFromUrl'
import { ClubSearchForm } from '../components/organizations/ClubSearchForm'
import OrganizationCard from '../components/organizations/OrganizationCard'
import { Icon } from '../components/ui/Icon'
import { panelClass } from '../components/ui/styles'
import { useClubDirectory } from '../hooks/useClubDirectory'

export default function ClubSearchPage() {
  const [params] = useSearchParams()
  const { clubs, loading, error } = useClubDirectory()
  const query = params.get('q')?.trim() ?? ''
  const category = params.get('category') ?? ''
  const sort = params.get('sort') === 'name' ? 'name' : ''
  const categories = [
    ...new Set(
      clubs
        .map((club) => club.category)
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort()
  if (category && !categories.includes(category)) categories.push(category)

  const terms = query.toLowerCase().split(/\s+/)
  const results = clubs.filter((club) => {
    const text = [club.name, club.description, club.category]
      .join(' ')
      .toLowerCase()
    return (
      (!category || club.category === category) &&
      terms.every((term) => text.includes(term))
    )
  })
  if (sort) results.sort((a, b) => a.name.localeCompare(b.name))

  function previewPath(clubId: string) {
    const next = new URLSearchParams(params)
    next.set('club', clubId)
    next.delete('event')
    return '/search?' + next
  }

  return (
    <section className="mx-auto max-w-6xl px-4 pt-7 sm:px-8 sm:pt-10">
      <Link
        to="/"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"
      >
        <Icon name="back" size={16} />
        Discover
      </Link>
      <h1 className="text-4xl font-semibold tracking-tight">Search results</h1>
      <ClubSearchForm
        key={JSON.stringify([query, category, sort])}
        query={query}
        filters={{ categories, category, sort }}
      />
      {loading && (
        <p role="status" className="mt-6 text-sm text-muted">
          Loading clubs…
        </p>
      )}
      {error && (
        <p
          role="alert"
          className={panelClass + ' mt-6 p-4 text-sm text-red-700'}
        >
          {error}
        </p>
      )}
      {!loading &&
        !error &&
        (results.length ? (
          <>
            <p role="status" className="mt-6 mb-3 text-sm text-muted">
              {results.length} {results.length === 1 ? 'club' : 'clubs'} found
            </p>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((club) => (
                <li key={club._id} className="[&>a]:h-full">
                  <OrganizationCard
                    organization={club}
                    to={previewPath(club._id)}
                  />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p
            role="status"
            className={panelClass + ' mt-6 p-5 text-sm text-muted'}
          >
            No clubs match your search.
          </p>
        ))}
      <ClubPreviewFromUrl clubs={clubs} />
    </section>
  )
}
