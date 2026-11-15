import { Navigate, useLocation } from 'react-router-dom'
import { authEntry } from '../lib/authDialog'
import type { AuthIntent, AuthMode } from '../lib/authDialog'

export default function AuthEntryPage({ mode }: { mode: AuthMode }) {
  const location = useLocation()
  const intent = location.state as AuthIntent | null
  return (
    <Navigate
      {...authEntry(mode, {
        from: mode === 'login' ? '/my-organizations' : '/',
        ...intent,
      })}
    />
  )
}
