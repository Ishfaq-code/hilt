import { useLocation, useNavigate } from 'react-router-dom'
import { AuthForm } from '../components/auth/AuthForm'
import type { AuthIntent, AuthMode } from '../lib/authFlow'

export default function AuthEntryPage({ mode }: { mode: AuthMode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const intent = (location.state as { authIntent?: AuthIntent } | null)
    ?.authIntent

  return (
    <AuthForm
      mode={mode}
      intent={intent}
      onModeChange={(next) =>
        navigate('/' + next, { replace: true, state: location.state })
      }
      onFinish={(destination, joinError) =>
        navigate(destination || '/', {
          replace: true,
          state: joinError ? { joinError } : null,
        })
      }
    />
  )
}
