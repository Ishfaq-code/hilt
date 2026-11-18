import {
  Navigate,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { ClubManagementWorkspace } from '../components/organizations/manage/ClubManagementWorkspace'
import { useSiteSession } from '../hooks/useCurrentUser'
import { authEntry } from '../lib/authFlow'

export default function OrganizationManagePage({
  admin = false,
}: {
  admin?: boolean
}) {
  const { organizationId = '' } = useParams()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, token } = useSiteSession()

  if (!token) return <Navigate {...authEntry('login', {})} />
  if (!user?.role)
    return (
      <p className="mx-auto max-w-6xl px-4 pt-10 text-sm text-muted">
        Loading account…
      </p>
    )
  if (user.role === 'admin' && !admin)
    return <Navigate to="/admin?tab=overview" replace />
  if (user.role !== 'admin' && admin)
    return (
      <Navigate
        to={'/organizations/' + organizationId + '/manage' + location.search}
        replace
      />
    )

  return (
    <ClubManagementWorkspace
      key={organizationId}
      organizationId={organizationId}
      admin={admin}
      requestedSection={searchParams.get('tab')}
      onSectionChange={(key) => {
        const next = new URLSearchParams(searchParams)
        next.set('tab', key)
        setSearchParams(next, { replace: true })
      }}
    />
  )
}
