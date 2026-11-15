import { Icon } from '../ui/Icon'
import { inputClass, panelClass } from '../ui/styles'

export function TagPicker({
  options,
  selected,
  onChange,
  name,
  inline = false,
}: {
  options: string[]
  selected: string[]
  onChange: (tags: string[]) => void
  name?: string
  inline?: boolean
}) {
  const choices = new Map<string, string>()
  for (const tag of [...options, ...selected]) {
    const key = tag.toLowerCase()
    if (!choices.has(key)) choices.set(key, tag)
  }
  const tags = [...choices.values()].sort((a, b) => a.localeCompare(b))
  const checked = new Set(selected.map((tag) => tag.toLowerCase()))

  function toggle(tag: string) {
    const key = tag.toLowerCase()
    onChange(
      checked.has(key)
        ? selected.filter((current) => current.toLowerCase() !== key)
        : [...selected, tag],
    )
  }

  const field = (
    <fieldset
      aria-label={inline ? undefined : 'Tags'}
      className={
        inline
          ? 'grid grid-cols-2 gap-1 sm:grid-cols-4'
          : panelClass +
            ' absolute top-full left-0 z-20 mt-1 grid max-h-64 w-full overflow-auto p-1 shadow-lg'
      }
    >
      {inline && <legend className="mb-1 text-sm font-medium">Tags</legend>}
      {tags.length ? (
        tags.map((tag) => (
          <label
            key={tag}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-paper"
          >
            <input
              name={name}
              type="checkbox"
              value={tag}
              className="size-4 shrink-0 accent-accent"
              checked={checked.has(tag.toLowerCase())}
              onChange={() => toggle(tag)}
            />
            <span className="wrap-anywhere">{tag}</span>
          </label>
        ))
      ) : (
        <p className="px-2.5 py-2 text-sm text-muted">No tags available</p>
      )}
    </fieldset>
  )

  if (inline) return field

  return (
    <details
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          event.currentTarget.open = false
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !event.currentTarget.open) return
        event.preventDefault()
        event.currentTarget.open = false
        event.currentTarget.querySelector('summary')?.focus()
      }}
    >
      <summary
        className={
          inputClass +
          ' flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden'
        }
        title={selected.length ? selected.join(', ') : undefined}
      >
        <span>{selected.length ? `Tags (${selected.length})` : 'Tags'}</span>
        <Icon name="chevronDown" size={16} />
      </summary>
      {field}
    </details>
  )
}
