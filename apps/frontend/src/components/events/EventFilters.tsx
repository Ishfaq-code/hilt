import { useState } from 'react'
import {
  eventCategoryOptions,
  eventDateOptions,
  eventTagOptions,
} from '../../lib/eventFilters'
import { TagPicker } from '../organizations/TagPicker'
import { Icon } from '../ui/Icon'
import { inputClass } from '../ui/styles'
import { EventDateRangeDialog } from './EventDateRangeDialog'

export function EventFilters({
  filters,
  eventTags,
  onChange,
}: {
  filters: URLSearchParams
  eventTags: string[]
  onChange: (updates: Record<string, string | string[]>) => void
}) {
  const [datesOpen, setDatesOpen] = useState(false)
  const when = filters.get('when') || 'any'
  const from = filters.get('from')
  const to = filters.get('to')
  const rangeLabel = [from, to]
    .filter((day, index) => day && (index === 0 || day !== from))
    .map((day) =>
      new Date(day + 'T12:00:00').toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
    )
    .join(' – ')
  const active = ['q', 'category', 'type', 'when', 'from', 'to'].some(
    (key) => filters.has(key) && filters.get(key) !== 'any',
  )

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 basis-60">
          <span className="sr-only">Search events, clubs or places</span>
          <span
            className={
              inputClass + ' flex items-center gap-2 focus-within:border-accent'
            }
          >
            <Icon name="search" size={18} />
            <input
              type="search"
              placeholder="Search events, clubs or places"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
              value={filters.get('q') || ''}
              onChange={(event) => onChange({ q: event.target.value })}
            />
          </span>
        </label>
        <label className="text-sm text-muted">
          <span className="sr-only">Sort events</span>
          <select
            className={inputClass}
            value={filters.get('sort') || 'soonest'}
            onChange={(event) => onChange({ sort: event.target.value })}
          >
            <option value="soonest">Soonest first</option>
            <option value="popular">Most popular</option>
          </select>
        </label>
      </div>

      <div
        role="group"
        aria-label="Event dates"
        className="flex flex-wrap gap-1.5"
      >
        {eventDateOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={when === option.value}
            className={
              'min-h-9 rounded-md border px-3 py-1.5 text-sm ' +
              (when === option.value
                ? 'border-accent bg-soft font-medium text-accent'
                : 'border-line bg-white text-muted hover:border-muted hover:text-ink')
            }
            onClick={() => {
              if (option.value === 'custom') {
                setDatesOpen(true)
                return
              }
              onChange({ when: option.value, from: '', to: '' })
            }}
          >
            {option.value === 'custom' && when === 'custom' && from
              ? rangeLabel
              : option.label}
          </button>
        ))}
      </div>

      {datesOpen && (
        <EventDateRangeDialog
          from={filters.get('from')}
          to={filters.get('to')}
          onClose={() => setDatesOpen(false)}
          onApply={(from, to) => {
            onChange({ when: 'custom', from, to })
            setDatesOpen(false)
          }}
        />
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 basis-48">
          <TagPicker
            label="Category"
            placeholder="All categories"
            showLabel
            options={eventCategoryOptions}
            selected={filters.getAll('category')}
            onChange={(category) => onChange({ category })}
          />
        </div>
        <div className="min-w-0 flex-1 basis-48">
          <TagPicker
            label="Event type"
            placeholder="All event types"
            showLabel
            options={[
              ...eventTagOptions,
              ...eventTags.filter((tag) => !eventCategoryOptions.includes(tag)),
            ]}
            selected={filters.getAll('type')}
            onChange={(type) => onChange({ type })}
          />
        </div>
        {active && (
          <button
            type="button"
            className="min-h-11 text-sm text-muted underline underline-offset-4 hover:text-ink"
            onClick={() =>
              onChange({
                q: '',
                category: [],
                type: [],
                when: '',
                from: '',
                to: '',
              })
            }
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
