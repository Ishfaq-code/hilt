import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { buttonClass, inputClass } from '../ui/styles'
import { TagPicker } from '../ui/TagPicker'

type Filters = { tags: string[]; selected: string[]; sort: string }

export function ClubSearchForm({
  query = '',
  filters,
}: {
  query?: string
  filters?: Filters
}) {
  const navigate = useNavigate()
  const form = useRef<HTMLFormElement>(null)

  function search(tags: string[]) {
    if (!form.current) return
    const data = new FormData(form.current)
    const params = new URLSearchParams()
    for (const key of ['q', 'sort']) {
      const value = String(data.get(key) ?? '').trim()
      if (value) params.set(key, value)
    }
    for (const tag of tags) params.append('tag', tag)
    navigate(params.size ? '/search?' + params : '/search')
  }

  return (
    <form
      role="search"
      aria-label="Club search"
      action="/search"
      ref={form}
      className="mt-5"
      onSubmit={(event) => {
        event.preventDefault()
        search(filters?.selected ?? [])
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
        <div className="mt-3 grid max-w-2xl grid-cols-2 items-start gap-2 sm:grid-cols-[repeat(2,11rem)]">
          <TagPicker
            options={filters.tags}
            selected={filters.selected}
            onChange={search}
          />
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
