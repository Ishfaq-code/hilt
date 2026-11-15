import { useLocation, useNavigate } from 'react-router-dom'
import { authPath, getAuthMode } from '../../lib/authDialog'
import type { AuthDialogState } from '../../lib/authDialog'
import { AuthDialog } from './AuthDialog'

export function RouteAuthDialog() {
  const location = useLocation()
  const navigate = useNavigate()
  const mode = getAuthMode(location.search)
  if (!mode) return null

  const state = location.state as AuthDialogState | null
  const request = state?.authDialog
  const returnPath = authPath(location)

  function close() {
    if (request?.dismissWithBack) navigate(-1)
    else navigate(returnPath, { replace: true })
  }

  return (
    <AuthDialog
      mode={mode}
      intent={request}
      onClose={close}
      onModeChange={(next) =>
        navigate(authPath(location, next), { replace: true, state })
      }
      onFinish={(destination, joinError) => {
        if ((!destination || destination === returnPath) && !joinError) {
          close()
        } else {
          navigate(destination ?? returnPath, {
            replace: true,
            state: joinError ? { joinError } : null,
          })
        }
      }}
    />
  )
}
