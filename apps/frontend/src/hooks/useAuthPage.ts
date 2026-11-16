import { useNavigate } from 'react-router-dom'
import type { AuthIntent } from '../lib/authFlow'

export function useAuthPage() {
  const navigate = useNavigate()

  return (intent: AuthIntent = {}) => {
    navigate('/login', { state: { authIntent: intent } })
  }
}
