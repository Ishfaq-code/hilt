import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { clubPreviewPath } from '../lib/clubs'

export default function OrganizationPage() {
  const { organizationId = '' } = useParams()
  const [params] = useSearchParams()
  return (
    <Navigate
      to={clubPreviewPath(organizationId, params.get('event') ?? undefined)}
      replace
    />
  )
}
