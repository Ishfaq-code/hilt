import { Link } from 'react-router-dom'
import type { JoinedOrganization } from '../../types/management'
import { Icon } from '../ui/Icon'
import { panelClass, secondaryClass } from '../ui/styles'
import { OrganizationAvatar } from './OrganizationAvatar'

export function JoinedClubList({
  organizations,
  onSelect,
}: {
  organizations: JoinedOrganization[]
  onSelect: (id: string) => void
}) {
  if (organizations.length === 0)
    return (
      <div className={panelClass + ' space-y-3 p-4'}>
        <p className="text-sm text-muted">You haven’t joined any clubs yet.</p>
        <Link to="/" className={secondaryClass}>
          Discover clubs
        </Link>
      </div>
    )

  return (
    <ul
      aria-label="Joined clubs"
      className={panelClass + ' divide-y divide-line'}
    >
      {organizations.map((club) => (
        <li key={club._id}>
          <button
            type="button"
            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-paper"
            onClick={() => onSelect(club._id)}
          >
            <OrganizationAvatar
              organization={club}
              className="size-10 text-sm"
            />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold break-words">
                {club.name}
              </span>
              {club.roles.length > 0 && (
                <span className="block text-xs break-words text-accent">
                  {club.roles.map(({ name }) => name).join(', ')}
                </span>
              )}
            </span>
            <span className="text-muted">
              <Icon name="chevronRight" size={18} />
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
