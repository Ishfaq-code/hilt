import { useNavigate } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { buttonClass, inputClass } from '../ui/styles'

type Filters = { categories: string[]; category: string; sort: string }

export function ClubSearchForm({
  query = '',
  filters,
}: {
  query?: string
  filters?: Filters
}) {
  const navigate = useNavigate()

  return (
    <form
      role="search"
      aria-label="Club search"
      action="/search"
      className="mt-5"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const params = new URLSearchParams()
        for (const key of ['q', 'category', 'sort']) {
          const value = String(data.get(key) ?? '').trim()
          if (value) params.set(key, value)
        }
        navigate(params.size ? '/search?' + params : '/search')
      }}
    >
      <div className="flex max-w-2xl gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute top-3.5 left-3 text-muted">
            <Icon name="search" size={17} />
          </span>
          <input
            name="q"
            type="search"
            aria-label="Search clubs"
            placeholder="Search clubs"
            defaultValue={query}
            className={inputClass + ' pl-10'}
          />
        </label>
        <button type="submit" className={buttonClass}>
          Search
        </button>
      </div>
      {filters && (
        <div className="mt-3 grid max-w-2xl grid-cols-2 gap-2 sm:flex">
          <select
            name="category"
            aria-label="Category"
            defaultValue={filters.category}
            className={inputClass + ' sm:w-44'}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
          >
            <option value="">All categories</option>
            {filters.categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
          <select
            name="sort"
            aria-label="Sort clubs"
            defaultValue={filters.sort}
            className={inputClass + ' sm:w-44'}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
          >
            <option value="">Default order</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      )}
    </form>
  )
}
