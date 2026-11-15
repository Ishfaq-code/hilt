import type { Location } from 'react-router-dom'

export type AuthMode = 'login' | 'register'

export type AuthIntent = {
  from?: string
  joinOrganizationId?: string
  joinOrganizationName?: string
  afterJoin?: string
}

type AuthRequest = AuthIntent & { dismissWithBack?: boolean }
export type AuthDialogState = { authDialog?: AuthRequest }

export function getAuthMode(search: string): AuthMode | undefined {
  const mode = new URLSearchParams(search).get('auth')
  if (mode === 'login' || mode === 'register') return mode
}

export function authPath(
  location: Pick<Location, 'pathname' | 'search' | 'hash'>,
  mode?: AuthMode,
) {
  const params = new URLSearchParams(location.search)
  if (mode) params.set('auth', mode)
  else params.delete('auth')
  return location.pathname + (params.size ? '?' + params : '') + location.hash
}

export function authEntry(mode: AuthMode, intent: AuthIntent) {
  return {
    to: authPath({ pathname: '/', search: '', hash: '' }, mode),
    replace: true,
    state: { authDialog: intent } satisfies AuthDialogState,
  }
}
