import { useLayoutEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { CheckInCodeDialog } from '../events/CheckInCodeDialog'
import { EventScanDialog } from '../events/EventScanDialog'
import { Icon } from '../ui/Icon'

const destinations = [
  { to: '/', label: 'Discover', icon: 'search' },
  { to: '/my-organizations', label: 'My clubs', icon: 'people' },
  { label: 'Scan QR', icon: 'camera' },
  { to: '/account', label: 'Account', icon: 'user' },
] as const

function currentDestination(pathname: string) {
  if (
    pathname === '/my-organizations' ||
    /^\/organizations\/[^/]+\/manage\/?$/.test(pathname)
  )
    return '/my-organizations'
  if (
    pathname === '/account' ||
    pathname === '/application' ||
    /^\/admin(?:\/|$)/.test(pathname)
  )
    return '/account'
  return '/'
}

const tabClass =
  'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-medium'

export function NativeLayout() {
  const session = useCurrentUser()
  const { pathname, search } = useLocation()
  const content = useRef<HTMLElement>(null)
  const [tool, setTool] = useState<'qr' | 'scan' | null>(null)
  const active = currentDestination(pathname)
  const screen = pathname === '/my-organizations' ? pathname + search : pathname

  useLayoutEffect(() => {
    content.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [screen])

  return (
    <div className="native-shell">
      <header className="flex shrink-0 items-center justify-between border-b border-line bg-white px-4 py-1.5">
        <span className="text-xl font-bold tracking-tight">
          Hilt<span className="text-accent">.</span>
        </span>
        <button
          type="button"
          aria-haspopup="dialog"
          className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-accent hover:bg-soft"
          onClick={() => setTool('qr')}
        >
          <Icon name="qr" size={20} />
          My QR
        </button>
      </header>
      <main
        ref={content}
        className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain pb-6"
      >
        <Outlet context={session} />
      </main>
      <nav
        aria-label="Primary navigation"
        className="native-tab-bar flex shrink-0 border-t border-line bg-white"
      >
        {destinations.map((item) => {
          if (!('to' in item))
            return (
              <button
                key={item.label}
                type="button"
                aria-haspopup="dialog"
                className={tabClass + ' text-muted hover:bg-paper'}
                onClick={() => setTool('scan')}
              >
                <Icon name={item.icon} size={21} />
                {item.label}
              </button>
            )

          const selected = active === item.to
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={selected ? 'page' : undefined}
              className={`${tabClass} ${selected ? 'bg-soft font-semibold text-accent' : 'text-muted hover:bg-paper'}`}
            >
              <Icon name={item.icon} size={21} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {tool === 'qr' && <CheckInCodeDialog onClose={() => setTool(null)} />}
      {tool === 'scan' && <EventScanDialog onClose={() => setTool(null)} />}
    </div>
  )
}
