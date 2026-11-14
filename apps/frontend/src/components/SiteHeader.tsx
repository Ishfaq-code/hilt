import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { clearAuthSession, getStoredUser } from '../auth'
import type { AuthUser } from '../types'

function SiteHeader() {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(() => sessionStorage.getItem('authToken') ? getStoredUser() : null)

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
      .catch(() => { /* Keep the cached name if the profile request is temporarily unavailable. */ })
    return () => { active = false }
  }, [])

  return (
    <header className="site-header">
      <Link className="wordmark" to="/" aria-label="Hilt home">
        <span className="brand-mark">H</span><span>hilt</span>
      </Link>
      <div className="header-actions">
        {user
          ? <><span className="user-greeting">{user.firstName} {user.lastName}</span><button className="button button-secondary" onClick={logout}>Log out</button></>
          : <button className="button button-secondary" onClick={() => navigate('/login')}>Log in / Register</button>}
        <button
          className="button button-primary"
          onClick={() => navigate(sessionStorage.getItem('authToken') ? '/application' : '/login', { state: { from: '/application' } })}
        >
          Create new application <span aria-hidden="true">↗</span>
        </button>
      </div>
    </header>
  )
}

export default SiteHeader
