import type { ReactNode } from 'react'
import type { Organization } from '../../types'

export const buttonClass =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-ink bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-active disabled:cursor-wait disabled:opacity-50'
export const secondaryClass =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-paper disabled:cursor-wait disabled:opacity-50'
export const inputClass =
  'min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/80'
export const panelClass = 'rounded-xl border border-line bg-white'

const paths = {
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  back: 'M19 12H5m6 6-6-6 6-6',
  home: 'M3 10.5 12 3l9 7.5M5 9v11h14V9m-10 11v-7h6v7',
  search: 'm21 21-4.4-4.4m2.4-5.6a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  calendar: 'M7 3v4m10-4v4M4 10h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z',
  people:
    'M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm4-4a4 4 0 0 1 0 8',
  pin: 'M20 10c0 5-8 11-8 11s-8-6-8-11a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z',
} as const

export function Icon({
  name,
  size = 18,
}: {
  name: keyof typeof paths
  size?: number
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d={paths[name]} />
    </svg>
  )
}

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

type Theme = 'tech' | 'outdoors' | 'film' | 'art'
function themeFor(category?: string): Theme {
  if (/outdoor|sport|recreation/i.test(category || '')) return 'outdoors'
  if (/art|design|culture/i.test(category || '')) return 'art'
  if (/film|media/i.test(category || '')) return 'film'
  return 'tech'
}
const coverColors: Record<Theme, [string, string]> = {
  tech: ['#ece8db', '#a78d63'],
  outdoors: ['#dfe8d9', '#64836a'],
  film: ['#ecdfdc', '#ab7369'],
  art: ['#e7e1ef', '#8d79a5'],
}

export function Cover({
  organization,
  large = false,
}: {
  organization: Organization
  large?: boolean
}) {
  const banner = organization.assets?.find((asset) =>
    /banner|cover/i.test(asset.type),
  )
  if (banner)
    return (
      <img
        src={banner.link}
        alt=""
        className={`block w-full object-cover ${large ? 'h-40 sm:h-48' : 'h-28'}`}
      />
    )
  const theme = themeFor(organization.category)
  const [background, foreground] = coverColors[theme]
  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden ${large ? 'h-40 sm:h-48' : 'h-28'}`}
      style={{ backgroundColor: background }}
    >
      <svg
        viewBox="0 0 280 130"
        preserveAspectRatio="xMidYMid slice"
        className="absolute right-0 h-full w-3/4"
        stroke={foreground}
        strokeWidth="1.25"
        fill="none"
      >
        {theme === 'tech' &&
          [0, 1, 2, 3, 4].map((i) => (
            <path
              key={i}
              d={`M${118 + i * 22} -12 L${267 + i * 22} 68 L${118 + i * 22} 148 L${-31 + i * 22} 68Z`}
            />
          ))}
        {theme === 'outdoors' &&
          [0, 1, 2, 3, 4].map((i) => (
            <path
              key={i}
              d={`M-30 ${110 + i * 10} Q42 ${-37 + i * 10} 108 ${44 + i * 10}T310 ${34 + i * 10}`}
            />
          ))}
        {theme === 'film' &&
          [0, 1, 2, 3, 4, 5].map((i) => (
            <circle key={i} cx="204" cy="73" r={23 + i * 14} />
          ))}
        {theme === 'art' &&
          [0, 1, 2, 3, 4].map((i) => (
            <rect
              key={i}
              x={90 + i * 20}
              y={8 + i * 9}
              width="120"
              height="84"
              transform={`rotate(${8 + i * 12} 180 68)`}
            />
          ))}
      </svg>
    </div>
  )
}

export function OrganizationAvatar({
  organization,
  className = 'size-12 text-xs',
}: {
  organization: Organization
  className?: string
}) {
  const logo = organization.assets?.find((asset) =>
    /logo|icon/i.test(asset.type),
  )
  const theme = themeFor(organization.category)
  const colors: Record<Theme, string> = {
    tech: 'bg-[#ece8db] text-[#59472d]',
    outdoors: 'bg-[#dfe8d9] text-[#344f39]',
    film: 'bg-[#ecdfdc] text-[#643e36]',
    art: 'bg-[#e7e1ef] text-[#524368]',
  }
  return (
    <span
      aria-hidden="true"
      className={`inline-grid shrink-0 place-items-center overflow-hidden rounded-lg font-bold ${className}${logo ? ' border border-line bg-white' : ` ${colors[theme]}`}`}
    >
      {logo ? (
        <img
          src={logo.link}
          alt=""
          className="size-full object-contain p-0.5"
        />
      ) : (
        organization.name
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0])
          .join('')
          .toUpperCase()
      )}
    </span>
  )
}

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
