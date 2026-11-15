import { Link } from 'react-router-dom'
import type { Organization } from '../types'
import { Cover, OrganizationAvatar, panelClass } from './wireframe/Design'

export default function OrganizationCard({
  organization,
}: {
  organization: Organization
}) {
  return (
    <Link
      to={`/organizations/${organization._id}`}
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
          {organization.category || 'Student organization'}
        </p>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
          {organization.description ||
            'Connect with other students around shared interests and ideas.'}
        </p>
      </div>
    </Link>
  )
}
