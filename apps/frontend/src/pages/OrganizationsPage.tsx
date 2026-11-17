import { useEffect, useState } from 'react'
import { ClubPreviewFromUrl } from '../components/organizations/ClubPreviewFromUrl'
import OrganizationCard from '../components/organizations/OrganizationCard'
import { inputClass, panelClass, secondaryClass } from '../components/ui/styles'
import { api } from '../lib/api'
import { clubTagOptions } from '../lib/clubTags'
import type { Organization } from '../types'

type Result = {
  organizations: Organization[]
  page: number
  total: number
  hasNext: boolean
}

const pageSize = 12

export default function OrganizationsPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<{ key: string; data: Result }>()
  const [error, setError] = useState('')
  const [errorKey, setErrorKey] = useState('')
  const [revision, setRevision] = useState(0)

  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
  })
  if (search.trim()) params.set('search', search.trim())
  if (category) params.set('category', category)
  const query = params.toString()
  const key = query + ':' + revision

  useEffect(() => {
    const request = new AbortController()
    const requestKey = query + ':' + revision
    api<Result>('/api/organizations?' + query, { signal: request.signal })
      .then((data) => {
        if (!request.signal.aborted) {
          setResult({ key: requestKey, data })
          setErrorKey('')
        }
      })
      .catch((cause: unknown) => {
        if (!request.signal.aborted) {
          setError(
            cause instanceof Error ? cause.message : 'Couldn’t load clubs.',
          )
          setErrorKey(requestKey)
        }
      })
    return () => request.abort()
  }, [query, revision])

  const current = result?.key === key ? result.data : undefined
  const loading = !current && errorKey !== key
  const currentError = errorKey === key ? error : ''

  function updateSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  function updateCategory(value: string) {
    setCategory(value)
    setPage(1)
  }

  return (
    <section className="mx-auto max-w-6xl px-4 pt-9 sm:px-8 sm:pt-13">
      <h1 className="text-4xl font-semibold tracking-tight">All clubs</h1>
      <div className="mt-5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <input
          type="search"
          aria-label="Search clubs"
          placeholder="Search clubs"
          className={inputClass}
          value={search}
          onChange={(change) => updateSearch(change.target.value)}
        />
        <select
          aria-label="Filter by category"
          className={inputClass}
          value={category}
          onChange={(change) => updateCategory(change.target.value)}
        >
          <option value="">All categories</option>
          {clubTagOptions.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <p role="status" className="py-8 text-sm text-muted">
          Loading clubs…
        </p>
      )}
      {currentError && (
        <div
          role="alert"
          className={panelClass + ' mt-4 p-5 text-sm text-red-700'}
        >
          <p>{currentError}</p>
          <button
            type="button"
            className="mt-2 font-semibold underline"
            onClick={() => setRevision((value) => value + 1)}
          >
            Try again
          </button>
        </div>
      )}
      {!loading &&
        !currentError &&
        current &&
        (current.organizations.length ? (
          <>
            <p className="mt-6 mb-3 text-sm text-muted">
              {current.total} {current.total === 1 ? 'club' : 'clubs'}
            </p>
            <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {current.organizations.map((organization) => (
                <li key={organization._id} className="[&>a]:h-full">
                  <OrganizationCard organization={organization} />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p
            role="status"
            className={panelClass + ' mt-6 p-5 text-sm text-muted'}
          >
            No clubs match those filters.
          </p>
        ))}
      <nav
        aria-label="Organization pages"
        className="mt-5 flex items-center justify-between"
      >
        <button
          type="button"
          className={secondaryClass}
          disabled={page <= 1 || loading}
          onClick={() => setPage((value) => value - 1)}
        >
          Previous
        </button>
        <span className="text-sm text-muted">
          Page {page}
          {current
            ? ` of ${Math.max(1, Math.ceil(current.total / pageSize))}`
            : ''}
        </span>
        <button
          type="button"
          className={secondaryClass}
          disabled={!current?.hasNext || loading}
          onClick={() => setPage((value) => value + 1)}
        >
          Next
        </button>
      </nav>
      <ClubPreviewFromUrl clubs={current?.organizations ?? []} />
    </section>
  )
}
