import { Link } from 'react-router-dom'
import type { JoinedOrganization } from '../../types/management'
import { Icon } from '../ui/Icon'
import { panelClass } from '../ui/styles'
import { OrganizationAvatar } from './OrganizationAvatar'

type Props = {
  organizations: JoinedOrganization[]
  selectedId: string
  hasSelected: boolean
  onHome: () => void
  onSelect: (id: string) => void
}

export function OrganizationSidebar({
  organizations,
  selectedId,
  hasSelected,
  onHome,
  onSelect,
}: Props) {
  return (
    <aside className={`${panelClass} min-w-0 self-start md:sticky md:top-4`}>
      <nav
        aria-label="Joined organizations"
        className="flex items-center gap-1 overflow-x-auto p-2 md:block"
      >
        <button
          type="button"
          aria-current={!hasSelected ? 'page' : undefined}
          onClick={onHome}
          className={`mb-2 flex shrink-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm ${!hasSelected ? 'bg-soft font-semibold text-accent' : 'text-muted hover:bg-paper'}`}
        >
          <Icon name="home" size={18} />
          Home
        </button>
        {organizations.map((organization) => (
          <button
            type="button"
            key={organization._id}
            aria-current={organization._id === selectedId ? 'page' : undefined}
            onClick={() => onSelect(organization._id)}
            className={`flex shrink-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm md:w-full ${organization._id === selectedId ? 'bg-soft font-semibold text-accent' : 'text-muted hover:bg-paper hover:text-ink'}`}
          >
            <OrganizationAvatar
              organization={organization}
              className="size-8 text-xs"
            />
            <span className="flex min-w-0 flex-col">
              <span className="md:truncate">{organization.name}</span>
              {['officer', 'owner'].includes(organization._membershipRole) && (
                <span className="text-xs font-medium text-accent">
                  {organization._membershipRole === 'owner'
                    ? 'Owner'
                    : 'Officer'}
                </span>
              )}
            </span>
          </button>
        ))}
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted hover:bg-paper hover:text-ink md:mt-2"
        >
          <Icon name="search" size={17} />
          Find organizations
        </Link>
      </nav>
    </aside>
  )
}
