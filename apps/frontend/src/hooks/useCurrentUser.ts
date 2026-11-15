import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { clearAuthSession, getStoredUser } from '../lib/auth'
import type { AuthUser } from '../types'
import { useAuthToken } from './useAuthToken'

export function useCurrentUser() {
  const { pathname } = useLocation()
  const token = useAuthToken()
  const [profile, setProfile] = useState<{
    token: string
    user: AuthUser
  } | null>(null)
  const user = !token
    ? null
    : profile?.token === token
      ? profile.user
      : getStoredUser()

  useEffect(() => {
    if (!token) return

    const request = new AbortController()
    fetch('/api/users/me', {
      headers: { Authorization: `Bearer ${token}` },
      signal: request.signal,
    })
      .then(async (response) => {
        if (response.status === 401 && !request.signal.aborted)
          clearAuthSession()
        return response.ok ? (response.json() as Promise<AuthUser>) : null
      })
      .then((currentUser) => {
        if (request.signal.aborted || !currentUser) return
        sessionStorage.setItem('authUser', JSON.stringify(currentUser))
        setProfile({ token, user: currentUser })
      })
      .catch(() => {
        // keep the cached profile if the request is temporarily unavailable
      })
    return () => request.abort()
  }, [pathname, token])

  return { user, token }
}
