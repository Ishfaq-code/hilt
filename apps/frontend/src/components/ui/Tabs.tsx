export function Tabs({
  items,
  active,
  label,
}: {
  items: { title: string; onClick: () => void }[]
  active: string
  label: string
}) {
  return (
    <nav
      aria-label={label}
      className="flex gap-6 overflow-x-auto border-b border-line"
    >
      {items.map(({ title, onClick }) => (
        <button
          type="button"
          key={title}
          aria-current={title === active ? 'page' : undefined}
          onClick={onClick}
          className={`shrink-0 border-b-2 px-0.5 py-3 text-sm font-semibold ${title === active ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'}`}
        >
          {title}
        </button>
      ))}
    </nav>
  )
}
