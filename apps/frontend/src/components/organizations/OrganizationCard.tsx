import { Link } from 'react-router-dom'
import { clubPreviewPath } from '../../lib/clubs'
import type { Organization } from '../../types'
import { panelClass } from '../ui/styles'
import { Cover } from './Cover'
import { OrganizationAvatar } from './OrganizationAvatar'

export default function OrganizationCard({
  organization,
  to = clubPreviewPath(organization._id),
}: {
  organization: Organization
  to?: string
}) {
  return (
    <Link
      to={to}
      aria-haspopup="dialog"
      className={`${panelClass} group block overflow-hidden hover:border-muted`}
    >
      <Cover organization={organization} />
      <div className="relative px-4 pb-4">
        <OrganizationAvatar
          organization={organization}
          className="-mt-6 size-12 text-xs"
        />
        <div className="mt-3 flex items-center justify-between gap-2">
          <h3 className="font-semibold">{organization.name}</h3>
          <span
            aria-hidden="true"
            className="text-muted transition-transform group-hover:translate-x-1"
          >
            →
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">
          {organization.category || 'Student club'}
        </p>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
          {organization.description ||
            'Connect with other students around shared interests and ideas.'}
        </p>
      </div>
    </Link>
  )
}
