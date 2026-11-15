import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuthDialog } from '../../hooks/useAuthDialog'
import { useAuthToken } from '../../hooks/useAuthToken'
import { clearAuthSession, getStoredUser } from '../../lib/auth'
import type { AuthUser } from '../../types'
import { CheckInCodeDialog } from '../events/CheckInCodeDialog'
import { EventScanDialog } from '../events/EventScanDialog'
import { Icon } from '../ui/Icon'

function SiteHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const openLogin = useAuthDialog()
  const token = useAuthToken()
  const [checkInTool, setCheckInTool] = useState<'qr' | 'scan' | null>(null)
  const [profile, setProfile] = useState<{
    token: string
    user: AuthUser
  } | null>(null)
  const user = !token
    ? null
    : profile?.token === token
      ? profile.user
      : getStoredUser()

  function logout() {
    clearAuthSession()
    setProfile(null)
    setCheckInTool(null)
    navigate('/')
  }

  useEffect(() => {
    if (!token) return

    let active = true
    fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (response.status === 401) {
          if (active) clearAuthSession()
          return null
        }
        if (!response.ok) return null
        return response.json() as Promise<AuthUser>
      })
      .then((currentUser) => {
        if (!active || !currentUser) return
        sessionStorage.setItem('authUser', JSON.stringify(currentUser))
        setProfile({ token, user: currentUser })
      })
      .catch(() => {
        // keep the cached name if the profile request is temporarily unavailable
      })
    return () => {
      active = false
    }
  }, [location.pathname, token])

  const nav = [
    { to: '/', label: 'Discover', end: true },
    ...(user
      ? [{ to: '/my-organizations', label: 'My clubs', end: false }]
      : []),
    { to: '/application', label: 'Apply', end: false },
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
            <button
              className="inline-flex min-h-8 items-center justify-center rounded-lg border border-line bg-white px-3 py-1 text-sm font-semibold hover:bg-paper"
              onClick={logout}
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            type="button"
            aria-haspopup="dialog"
            className="ml-auto inline-flex min-h-8 items-center justify-center rounded-lg border border-ink bg-ink px-3 py-1 text-sm font-semibold text-white hover:bg-active"
            onClick={() => openLogin()}
          >
            Log in
          </button>
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
