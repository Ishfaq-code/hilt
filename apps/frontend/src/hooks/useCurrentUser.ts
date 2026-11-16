import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useOutletContext } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import {
  clearWebAuthSession,
  getAuthToken,
  getStoredUser,
  storeUser,
} from '../lib/auth'
import { isNativeApp } from '../lib/platform'
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
      storeUser(currentUser)
      setProfile({ token, user: currentUser })
    },
    [token],
  )

  useEffect(() => {
    if (!token) return

    const request = new AbortController()
    activeRequest.current = request
    api<AuthUser>('/api/users/me', { signal: request.signal })
      .then((currentUser) => {
        if (!request.signal.aborted) updateUser(currentUser)
      })
      .catch((error: unknown) => {
        if (
          !isNativeApp &&
          !request.signal.aborted &&
          error instanceof ApiError &&
          error.status === 401 &&
          getAuthToken() === token
        )
          clearWebAuthSession()
      })
    return () => request.abort()
  }, [pathname, token, updateUser])

  return { user, token, updateUser }
}

export function useSiteSession() {
  return useOutletContext<ReturnType<typeof useCurrentUser>>()
}
