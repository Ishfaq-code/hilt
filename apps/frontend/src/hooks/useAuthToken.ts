import { useSyncExternalStore } from 'react'
import { getAuthToken, subscribeToAuthSession } from '../lib/auth'

export function useAuthToken() {
  return useSyncExternalStore(subscribeToAuthSession, getAuthToken)
}
