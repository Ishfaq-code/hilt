import type { ApiResponse, AuthUser } from './types'

const authTokenKey = 'authToken'
const authUserKey = 'authUser'

export function getStoredUser(): AuthUser | null {
  const value = sessionStorage.getItem(authUserKey)
  if (!value) return null
  try {
    return JSON.parse(value) as AuthUser
  } catch {
    sessionStorage.removeItem(authUserKey)
    return null
  }
}

export function saveAuthSession(result: ApiResponse) {
  if (result.token) sessionStorage.setItem(authTokenKey, result.token)
  if (result.firstName && result.lastName) {
    sessionStorage.setItem(authUserKey, JSON.stringify({
      firstName: result.firstName,
      lastName: result.lastName,
      email: result.email,
      role: result.role,
    } satisfies AuthUser))
  }
}

export function clearAuthSession() {
  sessionStorage.removeItem(authTokenKey)
  sessionStorage.removeItem(authUserKey)
}
