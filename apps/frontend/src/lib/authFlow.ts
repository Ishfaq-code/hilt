export type AuthMode = 'login' | 'register'

export type AuthIntent = {
  from?: string
  joinOrganizationId?: string
}

export function authEntry(mode: AuthMode, intent: AuthIntent) {
  return {
    to: '/' + mode,
    state: { authIntent: intent },
  }
}
