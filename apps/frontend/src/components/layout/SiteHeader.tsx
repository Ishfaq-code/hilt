import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import type { AuthUser } from '../../types'
import { CheckInCodeDialog } from '../events/CheckInCodeDialog'
import { EventScanDialog } from '../events/EventScanDialog'
import { Icon } from '../ui/Icon'

function SiteHeader({
  user,
  showApply,
}: {
  user: AuthUser | null
  showApply: boolean
}) {
  const [checkInTool, setCheckInTool] = useState<'qr' | 'scan' | null>(null)

  const nav = [
    { to: '/', label: 'Discover', end: true },
    { to: '/organizations', label: 'Clubs', end: false },
    { to: '/events', label: 'Events', end: false },
    ...(user
      ? [{ to: '/my-organizations', label: 'My clubs', end: false }]
      : []),
    ...(showApply ? [{ to: '/application', label: 'Apply', end: false }] : []),
    ...(user?.role === 'admin'
      ? [{ to: '/admin', label: 'Administration', end: false }]
      : []),
  ]

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 sm:gap-x-9 sm:px-8">
        <Link
          className="py-3 text-2xl font-bold tracking-tight"
          to="/"
          aria-label="Hilt home"
        >
          Hilt
          <span aria-hidden="true" className="text-accent">
            .
          </span>
        </Link>
        <nav
          aria-label="Primary navigation"
          className="flex flex-1 flex-wrap gap-x-4 sm:gap-x-6"
        >
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `border-b-2 py-4 text-sm font-semibold ${isActive ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        {user ? (
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <button
              type="button"
              aria-label="My QR"
              title="My QR"
              aria-haspopup="dialog"
              className="grid size-9 place-items-center rounded-lg hover:bg-paper"
              onClick={() => setCheckInTool('qr')}
            >
              <Icon name="qr" />
            </button>
            <button
              type="button"
              aria-label="Scan QR"
              title="Scan QR"
              aria-haspopup="dialog"
              className="grid size-9 place-items-center rounded-lg hover:bg-paper"
              onClick={() => setCheckInTool('scan')}
            >
              <Icon name="camera" />
            </button>
            <NavLink
              to="/account"
              aria-label="Account"
              title="Account"
              className={({ isActive }) =>
                'grid size-9 place-items-center rounded-lg hover:bg-paper' +
                (isActive ? ' bg-soft text-accent' : '')
              }
            >
              <Icon name="user" />
            </NavLink>
          </div>
        ) : (
          <Link
            to="/login"
            className="ml-auto inline-flex min-h-8 items-center justify-center rounded-lg border border-ink bg-ink px-3 py-1 text-sm font-semibold text-white hover:bg-active"
          >
            Log in
          </Link>
        )}
      </div>
      {user && checkInTool === 'qr' && (
        <CheckInCodeDialog onClose={() => setCheckInTool(null)} />
      )}
      {user && checkInTool === 'scan' && (
        <EventScanDialog onClose={() => setCheckInTool(null)} />
      )}
    </header>
  )
}

export default SiteHeader
