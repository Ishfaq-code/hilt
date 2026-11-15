import type { ReactNode } from 'react'
import { Icon } from '../ui/Icon'

export function Workspace({
  title,
  nav,
  active,
  back,
  action,
  children,
}: {
  title: string
  nav: { title: string; onClick: () => void }[]
  active: string
  back?: { title: string; onClick: () => void }
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-7 sm:px-8 md:pt-10">
      {back && (
        <button
          type="button"
          onClick={back.onClick}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"
        >
          <Icon name="back" size={15} />
          {back.title}
        </button>
      )}
      <div className="grid gap-6 md:grid-cols-[12rem_minmax(0,1fr)]">
        <aside className="border-line md:border-r md:pr-5">
          <p className="mb-2 text-xs font-bold tracking-wider text-accent uppercase">
            {title}
          </p>
          <nav aria-label={title} className="flex flex-wrap gap-1 md:flex-col">
            {nav.map((item) => (
              <button
                type="button"
                key={item.title}
                aria-current={active === item.title ? 'page' : undefined}
                onClick={item.onClick}
                className={`rounded-lg px-3 py-2.5 text-left text-sm ${active === item.title ? 'bg-soft font-semibold text-accent' : 'text-muted hover:bg-white'}`}
              >
                {item.title}
              </button>
            ))}
          </nav>
          {action && <div className="mt-3 md:mt-7">{action}</div>}
        </aside>
        <section className="min-w-0">{children}</section>
      </div>
    </div>
  )
}
