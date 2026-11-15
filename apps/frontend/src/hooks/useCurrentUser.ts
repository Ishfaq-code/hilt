import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useOutletContext } from 'react-router-dom'
import { clearAuthSession, getAuthToken, getStoredUser } from '../lib/auth'
import type { AuthUser } from '../types'
import { useAuthToken } from './useAuthToken'

export function useCurrentUser() {
  const { pathname } = useLocation()
  const token = useAuthToken()
  const activeRequest = useRef<AbortController>(null)
  const [profile, setProfile] = useState<{
    token: string
    user: AuthUser
  } | null>(null)
  const user = !token
    ? null
    : profile?.token === token
      ? profile.user
      : getStoredUser()

  const updateUser = useCallback(
    (currentUser: AuthUser) => {
      if (!token || getAuthToken() !== token) return
      activeRequest.current?.abort()
      sessionStorage.setItem('authUser', JSON.stringify(currentUser))
      setProfile({ token, user: currentUser })
    },
    [token],
  )

  useEffect(() => {
    if (!token) return

    const request = new AbortController()
    activeRequest.current = request
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
        updateUser(currentUser)
      })
      .catch(() => {
        // keep the cached profile if the request is temporarily unavailable
      })
    return () => request.abort()
  }, [pathname, token, updateUser])

  return { user, token, updateUser }
}

export function useSiteSession() {
  return useOutletContext<ReturnType<typeof useCurrentUser>>()
}
