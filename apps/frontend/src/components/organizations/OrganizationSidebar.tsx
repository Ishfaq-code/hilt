import { Link, useNavigate } from 'react-router-dom'
import type { JoinedOrganization } from '../../types/management'
import { Icon } from '../ui/Icon'
import { panelClass } from '../ui/styles'
import { OrganizationAvatar } from './OrganizationAvatar'

type Props = {
  organizations: JoinedOrganization[]
  selected?: JoinedOrganization
  onSelect: (id: string) => void
}

function ClubSwitcher({ organizations, selected, onSelect }: Props) {
  const navigate = useNavigate()

  return (
    <label className="relative flex min-h-11 max-w-full items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent md:hidden">
      {selected ? (
        <OrganizationAvatar
          organization={selected}
          className="size-6 text-xs"
        />
      ) : (
        <Icon name="calendar" size={17} />
      )}
      <span aria-hidden="true" className="truncate">
        {selected?.name ?? 'Your calendar'}
      </span>
      <Icon name="chevronDown" size={16} />
      <select
        aria-label="Switch club"
        className="absolute inset-0 size-full cursor-pointer opacity-0"
        value={selected?._id ?? ''}
        onChange={(event) => {
          const value = event.target.value
          if (value === 'discover') void navigate('/')
          else onSelect(value)
        }}
      >
        <option value="">Your calendar</option>
        {organizations.map((club) => (
          <option key={club._id} value={club._id}>
            {club.name}
            {club.roles.length > 0 &&
              ' — ' + club.roles.map((role) => role.name).join(', ')}
          </option>
        ))}
        <option value="discover">Find clubs</option>
      </select>
    </label>
  )
}

export function OrganizationSidebar({
  organizations,
  selected,
  onSelect,
}: Props) {
  return (
    <aside className="min-w-0 max-w-full self-center justify-self-end md:sticky md:top-4 md:self-start md:justify-self-stretch">
      <ClubSwitcher
        organizations={organizations}
        selected={selected}
        onSelect={onSelect}
      />
      <nav
        aria-label="Joined clubs"
        className={`${panelClass} hidden p-2 md:block`}
      >
        <button
          type="button"
          aria-current={!selected ? 'page' : undefined}
          onClick={() => onSelect('')}
          className={`mb-2 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm ${!selected ? 'bg-soft font-semibold text-accent' : 'text-muted hover:bg-paper'}`}
        >
          <Icon name="calendar" size={18} />
          Your calendar
        </button>
        {organizations.map((organization) => (
          <button
            type="button"
            key={organization._id}
            aria-current={
              organization._id === selected?._id ? 'page' : undefined
            }
            onClick={() => onSelect(organization._id)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm ${organization._id === selected?._id ? 'bg-soft font-semibold text-accent' : 'text-muted hover:bg-paper hover:text-ink'}`}
          >
            <OrganizationAvatar
              organization={organization}
              className="size-8 text-xs"
            />
            <span className="flex min-w-0 flex-col">
              <span className="truncate">{organization.name}</span>
              {organization.roles.length > 0 && (
                <span className="truncate text-xs font-medium text-accent">
                  {organization.roles.map((role) => role.name).join(', ')}
                </span>
              )}
            </span>
          </button>
        ))}
        <Link
          to="/"
          className="mt-2 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted hover:bg-paper hover:text-ink"
        >
          <Icon name="search" size={17} />
          Find clubs
        </Link>
      </nav>
    </aside>
  )
}
