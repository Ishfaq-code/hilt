import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { CheckInCodeDialog } from '../components/events/CheckInCodeDialog'
import { EventScanDialog } from '../components/events/EventScanDialog'

export default function CheckInPage({ mode }: { mode: 'qr' | 'scan' }) {
  const location = useLocation()
  const navigate = useNavigate()

  if (!sessionStorage.getItem('authToken')) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }

  const close = () => navigate('/my-organizations', { replace: true })

  return mode === 'qr' ? (
    <CheckInCodeDialog onClose={close} />
  ) : (
    <EventScanDialog onClose={close} linkQuery={location.search} />
  )
}
