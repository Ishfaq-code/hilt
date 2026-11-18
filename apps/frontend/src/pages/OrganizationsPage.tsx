import { useEffect, useRef, useState } from 'react'
import { BrowsePreviewFromUrl } from '../components/organizations/BrowsePreviewFromUrl'
import OrganizationCard from '../components/organizations/OrganizationCard'
import { inputClass, panelClass } from '../components/ui/styles'
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
  const filters = new URLSearchParams({
    search: search.trim(),
    category,
  }).toString()

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
          onChange={(change) => setSearch(change.target.value)}
        />
        <select
          aria-label="Filter by category"
          className={inputClass}
          value={category}
          onChange={(change) => setCategory(change.target.value)}
        >
          <option value="">All categories</option>
          {clubTagOptions.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </div>
      <OrganizationResults key={filters} filters={filters} />
    </section>
  )
}

function OrganizationResults({ filters }: { filters: string }) {
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<Result>()
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const nextPage = useRef<HTMLDivElement>(null)

  const loading = !error && result?.page !== page
  const canLoadMore = !loading && !error && result?.hasNext

  useEffect(() => {
    const request = new AbortController()
    const params = new URLSearchParams(filters)
    params.set('page', String(page))
    params.set('limit', String(pageSize))

    api<Result>('/api/organizations?' + params, { signal: request.signal })
      .then((data) => {
        if (request.signal.aborted) return

        setResult((previous) => {
          const organizations = new Map(
            previous?.organizations.map((club) => [club._id, club]),
          )
          data.organizations.forEach((club) =>
            organizations.set(club._id, club),
          )
          return { ...data, organizations: [...organizations.values()] }
        })
      })
      .catch((cause: unknown) => {
        if (request.signal.aborted) return
        setError(
          cause instanceof Error ? cause.message : 'Couldn’t load clubs.',
        )
      })

    return () => request.abort()
  }, [filters, page, retry])

  useEffect(() => {
    if (!canLoadMore || !nextPage.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        observer.disconnect()
        setPage(page + 1)
      },
      { rootMargin: '180px 0px' },
    )
    observer.observe(nextPage.current)
    return () => observer.disconnect()
  }, [canLoadMore, page])

  return (
    <>
      {result &&
        (result.organizations.length ? (
          <ul
            aria-busy={loading}
            className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          >
            {result.organizations.map((organization) => (
              <li key={organization._id} className="[&>a]:h-full">
                <OrganizationCard
                  organization={organization}
                  to={'?' + new URLSearchParams({ club: organization._id })}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p
            role="status"
            className={panelClass + ' mt-6 p-5 text-sm text-muted'}
          >
            No clubs match those filters.
          </p>
        ))}
      {canLoadMore && (
        <div ref={nextPage} className="h-px" aria-hidden="true" />
      )}
      {loading && (
        <p role="status" className="py-4 text-sm text-muted">
          Loading clubs…
        </p>
      )}
      {error && (
        <div
          role="alert"
          className={panelClass + ' mt-4 p-5 text-sm text-red-700'}
        >
          <p>{error}</p>
          <button
            type="button"
            className="mt-2 font-semibold underline"
            onClick={() => {
              setError('')
              setRetry((value) => value + 1)
            }}
          >
            Try again
          </button>
        </div>
      )}
      <BrowsePreviewFromUrl clubs={result?.organizations ?? []} />
    </>
  )
}
