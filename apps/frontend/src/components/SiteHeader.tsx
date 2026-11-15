import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { clearAuthSession, getStoredUser } from '../auth'
import type { AuthUser } from '../types'

function SiteHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState<AuthUser | null>(() =>
    sessionStorage.getItem('authToken') ? getStoredUser() : null,
  )

  function logout() {
    clearAuthSession()
    setUser(null)
    navigate('/')
  }

  useEffect(() => {
    const token = sessionStorage.getItem('authToken')
    if (!token) return

    let active = true
    fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (response.status === 401) {
          clearAuthSession()
          if (active) setUser(null)
          return null
        }
        if (!response.ok) return null
        return response.json() as Promise<AuthUser>
      })
      .then((currentUser) => {
        if (!active || !currentUser) return
        sessionStorage.setItem('authUser', JSON.stringify(currentUser))
        setUser(currentUser)
      })
      .catch(() => {
        /* Keep the cached name if the profile request is temporarily unavailable. */
      })
    return () => {
      active = false
    }
  }, [location.pathname])

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
    <>
      <div className="border-b border-line bg-[#eeefe8]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-8">
          <span className="text-xs font-semibold tracking-[.12em] text-muted uppercase">
            Hilt campus communities
          </span>
          <span className="text-xs font-medium text-muted">
            {user
              ? `${user.firstName} ${user.lastName}`
              : 'Explore organizations'}
          </span>
        </div>
      </div>
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
                className="inline-flex min-h-8 items-center justify-center rounded-lg border border-line bg-white px-3 py-1 text-sm font-semibold hover:bg-paper"
                onClick={logout}
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              className="ml-auto inline-flex min-h-8 items-center justify-center rounded-lg border border-ink bg-ink px-3 py-1 text-sm font-semibold text-white hover:bg-active"
              onClick={() => navigate('/login')}
            >
              Log in
            </button>
          )}
        </div>
      </header>
    </>
  )
}

export default SiteHeader
