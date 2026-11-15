import { ClubPreviewFromUrl } from '../components/organizations/ClubPreviewFromUrl'
import { ClubSearchForm } from '../components/organizations/ClubSearchForm'
import { OrganizationRow } from '../components/organizations/OrganizationRow'
import { panelClass } from '../components/ui/styles'
import { useClubDirectory } from '../hooks/useClubDirectory'

const categories = [
  { category: 'Outdoors', title: 'Crave the outdoors?' },
  { category: 'Technology', title: 'Techies' },
  { category: 'Arts', title: 'For the artists' },
]

export default function HomePage() {
  const { clubs, loading, error } = useClubDirectory()

  return (
    <section className="mx-auto max-w-6xl px-4 pt-9 sm:px-8 sm:pt-13">
      <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
        Find clubs and events on campus.
      </h1>
      <ClubSearchForm />
      {loading && (
        <p role="status" className="py-8 text-sm text-muted">
          Loading clubs…
        </p>
      )}
      {error && (
        <p
          role="alert"
          className={panelClass + ' mt-4 p-5 text-sm text-red-700'}
        >
          {error}
        </p>
      )}
      {!loading && !error && (
        <>
          <OrganizationRow title="Popular" organizations={clubs} />
          {categories.map(({ category, title }) => {
            const matches = clubs.filter(
              (club) => club.category?.toLowerCase() === category.toLowerCase(),
            )
            return matches.length ? (
              <OrganizationRow
                key={category}
                title={title}
                organizations={matches}
              />
            ) : null
          })}
        </>
      )}
      <ClubPreviewFromUrl clubs={clubs} />
    </section>
  )
}
