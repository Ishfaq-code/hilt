import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'

export function Workspace({
  title,
  nav,
  active,
  back,
  action,
  scrollable = false,
  children,
}: {
  title: string
  nav: { title: string; onClick: () => void }[]
  active: string
  back?: { title: string; to: string }
  action?: ReactNode
  scrollable?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={
        'mx-auto w-full max-w-6xl px-4 pt-7 sm:px-8 md:pt-10' +
        (scrollable
          ? ' flex h-[calc(100dvh-11rem)] flex-col pb-6 lg:h-[calc(100dvh-3.5rem)]'
          : '')
      }
    >
      {back && (
        <Link
          to={back.to}
          className="mb-6 inline-flex shrink-0 items-center gap-2 self-start text-sm font-medium text-muted hover:text-ink"
        >
          <Icon name="back" size={15} />
          {back.title}
        </Link>
      )}
      <div
        className={
          'grid gap-6 md:grid-cols-[12rem_minmax(0,1fr)]' +
          (scrollable
            ? ' min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] md:grid-rows-1'
            : '')
        }
      >
        <aside className="border-line md:border-r md:pr-5">
          <p className="mb-2 text-xs font-bold tracking-wider text-accent uppercase">
            {title}
          </p>
          <nav aria-label={title} className="flex flex-wrap gap-1 md:flex-col">
            {nav.map((item) => (
              <button
                type="button"
                key={item.title}
                aria-current={
                  active === item.title
                    ? scrollable
                      ? 'location'
                      : 'page'
                    : undefined
                }
                onClick={item.onClick}
                className={`rounded-lg px-3 py-2.5 text-left text-sm ${active === item.title ? 'bg-soft font-semibold text-accent' : 'text-muted hover:bg-white'}`}
              >
                {item.title}
              </button>
            ))}
          </nav>
          {action && <div className="mt-3 md:mt-7">{action}</div>}
        </aside>
        <section className={'min-w-0' + (scrollable ? ' min-h-0' : '')}>
          {children}
        </section>
      </div>
    </div>
  )
}
