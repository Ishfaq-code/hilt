import { useLocation, useNavigate } from 'react-router-dom'
import { authPath } from '../lib/authDialog'
import type { AuthDialogState, AuthIntent } from '../lib/authDialog'

export function useAuthDialog() {
  const location = useLocation()
  const navigate = useNavigate()

  return (intent: AuthIntent = {}) => {
    navigate(authPath(location, 'login'), {
      state: {
        ...location.state,
        authDialog: { ...intent, dismissWithBack: true },
      } satisfies AuthDialogState,
    })
  }
}
