import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { CheckInCodeDialog } from '../components/events/CheckInCodeDialog'
import { EventScanDialog } from '../components/events/EventScanDialog'
import { useAuthToken } from '../hooks/useAuthToken'
import { authEntry } from '../lib/authFlow'

export default function CheckInPage({ mode }: { mode: 'qr' | 'scan' }) {
  const location = useLocation()
  const navigate = useNavigate()
  const token = useAuthToken()

  if (!token) {
    return <Navigate {...authEntry('login', {})} />
  }

  const close = () => navigate('/my-organizations', { replace: true })

  return mode === 'qr' ? (
    <CheckInCodeDialog onClose={close} />
  ) : (
    <EventScanDialog onClose={close} linkQuery={location.search} />
  )
}
