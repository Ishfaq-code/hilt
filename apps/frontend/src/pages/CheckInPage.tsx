import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { CheckInCodeDialog } from '../components/events/CheckInCodeDialog'
import { EventScanDialog } from '../components/events/EventScanDialog'
import { useAuthToken } from '../hooks/useAuthToken'
import { authEntry, authPath } from '../lib/authDialog'
import { isNativeApp } from '../lib/platform'

export default function CheckInPage({ mode }: { mode: 'qr' | 'scan' }) {
  const location = useLocation()
  const navigate = useNavigate()
  const token = useAuthToken()

  if (!token) {
    return <Navigate {...authEntry('login', { from: authPath(location) })} />
  }

  const returnTo = location.state?.returnTo ?? '/my-organizations'
  const close = () => navigate(returnTo, { replace: true })

  return mode === 'qr' ? (
    <CheckInCodeDialog asPage={isNativeApp} onClose={close} />
  ) : (
    <EventScanDialog
      asPage={isNativeApp}
      onClose={close}
      linkQuery={location.search}
    />
  )
}
