import { DiscoverEventList } from '../components/events/DiscoverEventList'
import { ClubPreviewFromUrl } from '../components/organizations/ClubPreviewFromUrl'
import { ClubSearchForm } from '../components/organizations/ClubSearchForm'
import { OrganizationRow } from '../components/organizations/OrganizationRow'
import { panelClass } from '../components/ui/styles'
import { useClubDirectory } from '../hooks/useClubDirectory'
import { hasAnyTag } from '../lib/clubTags'

const sections = [
  { tag: 'Outdoors', title: 'Crave the outdoors?' },
  { tag: 'Technology', title: 'Techies' },
  { tag: 'Arts', title: 'For the artists' },
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
          {sections.map(({ tag, title }) => {
            const matches = clubs.filter((club) => hasAnyTag(club.tags, [tag]))
            return matches.length ? (
              <OrganizationRow
                key={tag}
                title={title}
                organizations={matches}
              />
            ) : null
          })}
        </>
      )}
      <DiscoverEventList clubs={clubs} />
      <ClubPreviewFromUrl clubs={clubs} />
    </section>
  )
}
