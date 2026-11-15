import { useSearchParams } from 'react-router-dom'
import type { Organization } from '../../types'
import { ClubPreviewDialog } from './ClubPreviewDialog'

export function ClubPreviewFromUrl({ clubs }: { clubs: Organization[] }) {
  const [params, setParams] = useSearchParams()
  const clubId = params.get('club')
  if (!clubId) return null

  function close(closeClub: boolean) {
    const next = new URLSearchParams(params)
    next.delete('event')
    if (closeClub) next.delete('club')
    setParams(next, { replace: true })
  }

  return (
    <ClubPreviewDialog
      key={clubId}
      clubId={clubId}
      eventId={params.get('event')}
      initialClub={clubs.find((club) => club._id === clubId)}
      onClose={() => close(true)}
      onCloseEvent={() => close(false)}
    />
  )
}
