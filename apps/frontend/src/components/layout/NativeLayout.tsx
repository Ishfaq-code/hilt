import { useLayoutEffect, useRef } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { Icon } from '../ui/Icon'

const destinations = [
  { to: '/', label: 'Discover', icon: 'search' },
  { to: '/my-organizations', label: 'My clubs', icon: 'people' },
  { to: '/qr', label: 'My QR', icon: 'qr' },
  { to: '/scan', label: 'Scan QR', icon: 'camera' },
  { to: '/account', label: 'Account', icon: 'user' },
] as const

function currentDestination(pathname: string) {
  if (pathname === '/qr' || pathname === '/scan') return pathname
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

const tabClass = 'flex min-w-0 flex-1 items-center justify-center'

export function NativeLayout() {
  const session = useCurrentUser()
  const { pathname, search } = useLocation()
  const content = useRef<HTMLElement>(null)
  const active = currentDestination(pathname)
  const screen = pathname === '/my-organizations' ? pathname + search : pathname

  useLayoutEffect(() => {
    content.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [screen])

  return (
    <div className="native-shell">
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
          const selected = active === item.to
          return (
            <Link
              key={item.to}
              to={item.to}
              state={
                item.to === '/scan' && !selected
                  ? { returnTo: pathname + search }
                  : undefined
              }
              aria-label={item.label}
              aria-current={selected ? 'page' : undefined}
              className={`${tabClass} ${selected ? 'bg-soft text-accent' : 'text-muted hover:bg-paper'}`}
            >
              <Icon name={item.icon} size={23} />
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
