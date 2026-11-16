import {
  KeychainAccess,
  SecureStorage,
} from '@aparajita/capacitor-secure-storage'
import type { ApiResponse, AuthUser } from '../types'
import { apiUrl, isNativeApp } from './platform'

const authTokenKey = 'authToken'
const authUserKey = 'authUser'
const refreshKey = 'hilt.mobile.refresh'
const sessionChanged = 'hilt:auth-session-changed'

let mobileToken: string | null = null
let mobileUser: AuthUser | null = null
let pendingRefresh: Promise<string | null> | undefined
let signingOut = false

function notifySessionChanged() {
  window.dispatchEvent(new Event(sessionChanged))
}

export function getAuthToken() {
  return isNativeApp ? mobileToken : sessionStorage.getItem(authTokenKey)
}

export function subscribeToAuthSession(listener: () => void) {
  window.addEventListener(sessionChanged, listener)
  return () => window.removeEventListener(sessionChanged, listener)
}

export function getStoredUser(): AuthUser | null {
  if (isNativeApp) return mobileUser

  const value = sessionStorage.getItem(authUserKey)
  if (!value) return null

  try {
    return JSON.parse(value) as AuthUser
  } catch {
    sessionStorage.removeItem(authUserKey)
    return null
  }
}

export function storeUser(user: AuthUser) {
  if (isNativeApp) mobileUser = user
  else sessionStorage.setItem(authUserKey, JSON.stringify(user))
}

export async function saveAuthSession(result: ApiResponse) {
  if (isNativeApp) {
    if (!result.token || !result.refreshToken)
      throw new Error('Couldn’t save your login. Please try again.')
    await SecureStorage.set(
      refreshKey,
      result.refreshToken,
      false,
      false,
      KeychainAccess.whenUnlockedThisDeviceOnly,
    )
    mobileToken = result.token
  } else if (result.token) {
    sessionStorage.setItem(authTokenKey, result.token)
  }

  if (result.firstName && result.lastName) {
    storeUser({
      firstName: result.firstName,
      lastName: result.lastName,
      email: result.email,
      role: result.role,
    })
  }
  notifySessionChanged()
}

export function clearWebAuthSession() {
  sessionStorage.removeItem(authTokenKey)
  sessionStorage.removeItem(authUserKey)
  notifySessionChanged()
}

async function clearMobileAuthSession() {
  await SecureStorage.remove(refreshKey, false)
  mobileToken = null
  mobileUser = null
  notifySessionChanged()
}

async function sessionRequest(
  action: 'refresh' | 'logout',
  refreshToken: string,
) {
  const request = new AbortController()
  const timeout = window.setTimeout(() => request.abort(), 10000)
  try {
    return await fetch(apiUrl('/api/auth/mobile/' + action), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      signal: request.signal,
    })
  } finally {
    window.clearTimeout(timeout)
  }
}

async function renewMobileSession() {
  const refreshToken = await SecureStorage.get(refreshKey, false, false)
  if (typeof refreshToken !== 'string') return null

  const response = await sessionRequest('refresh', refreshToken)
  if (response.status === 401) {
    await clearMobileAuthSession()
    return null
  }
  if (!response.ok) throw new Error('Couldn’t restore your session.')

  await saveAuthSession((await response.json()) as ApiResponse)
  return mobileToken
}

export function refreshAuthSession() {
  if (signingOut) return Promise.resolve(null)
  pendingRefresh ??= renewMobileSession().finally(() => {
    pendingRefresh = undefined
  })
  return pendingRefresh
}

export async function signOut() {
  if (!isNativeApp) {
    clearWebAuthSession()
    return
  }

  signingOut = true
  try {
    await pendingRefresh?.catch(() => {})
    const refreshToken = await SecureStorage.get(refreshKey, false, false)
    await clearMobileAuthSession()
    if (typeof refreshToken === 'string')
      await sessionRequest('logout', refreshToken).catch(() => {})
  } finally {
    signingOut = false
  }
}
