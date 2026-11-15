import { useId, useRef, useState } from 'react'
import { Icon } from '../ui/Icon'
import { inputClass, panelClass } from '../ui/styles'

export function TagPicker({
  options,
  selected,
  onChange,
  name,
  label = 'Tags',
  showLabel = false,
}: {
  options: string[]
  selected: string[]
  onChange: (tags: string[]) => void
  name?: string
  label?: string
  showLabel?: boolean
}) {
  const id = useId()
  const suggestionsId = id + '-suggestions'
  const input = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const term = query.trim().toLowerCase()

  const taken = new Set(selected.map((tag) => tag.toLowerCase()))
  const matches = new Map<string, string>()
  for (const tag of options) {
    const key = tag.toLowerCase()
    if (term && key.includes(term) && !taken.has(key) && !matches.has(key)) {
      matches.set(key, tag)
    }
  }
  const suggestions = [...matches.values()].sort((a, b) => a.localeCompare(b))

  function addTag(tag: string) {
    setQuery('')
    onChange([...selected, tag])
    input.current?.focus()
  }

  return (
    <div
      className="relative min-w-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setQuery('')
      }}
      onKeyDown={(event) => {
        if (!term || event.key !== 'Escape') return
        event.preventDefault()
        setQuery('')
        input.current?.focus()
      }}
    >
      {showLabel && (
        <label htmlFor={id} className="mb-2 block text-sm font-medium">
          {label}
        </label>
      )}
      <div
        className={
          inputClass +
          ' flex flex-wrap items-center gap-1.5 focus-within:border-accent'
        }
      >
        {selected.map((tag) => (
          <span key={tag} className="max-w-full">
            {name && <input type="hidden" name={name} value={tag} />}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              className="inline-flex max-w-full cursor-pointer items-center gap-1 rounded-md bg-paper px-2 py-0.5 text-left text-xs font-medium text-ink hover:bg-soft"
              onClick={() => {
                onChange(selected.filter((current) => current !== tag))
                input.current?.focus()
              }}
            >
              <span className="wrap-anywhere">{tag}</span>
              <Icon name="close" size={12} />
            </button>
          </span>
        ))}
        <input
          id={id}
          ref={input}
          type="text"
          aria-label={showLabel ? undefined : label}
          aria-autocomplete="list"
          aria-controls={term ? suggestionsId : undefined}
          autoComplete="off"
          placeholder={
            selected.length ? 'Add tag' : `Search ${label.toLowerCase()}`
          }
          className="min-w-18 flex-1 bg-transparent placeholder:text-muted focus-visible:outline-none"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (!term || event.key !== 'Enter' || event.nativeEvent.isComposing)
              return
            event.preventDefault()
            if (suggestions.length) addTag(suggestions[0])
          }}
        />
      </div>
      {term && (
        <div
          id={suggestionsId}
          className={
            panelClass +
            ' absolute top-full left-0 z-20 mt-1 max-h-64 w-full overflow-auto p-1 shadow-lg'
          }
        >
          {suggestions.length ? (
            <ul aria-label="Matching tags">
              {suggestions.map((tag) => (
                <li key={tag}>
                  <button
                    type="button"
                    className="w-full cursor-pointer rounded-md px-2.5 py-2 text-left text-sm wrap-anywhere hover:bg-paper focus-visible:bg-paper focus-visible:outline-offset-[-2px]"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => addTag(tag)}
                  >
                    {tag}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p role="status" className="px-2.5 py-2 text-sm text-muted">
              No matching tags
            </p>
          )}
        </div>
      )}
    </div>
  )
}
