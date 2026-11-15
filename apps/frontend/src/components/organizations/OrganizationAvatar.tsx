import type { Organization } from '../../types'
import type { Theme } from './theme'
import { themeFor } from './theme'

export function OrganizationAvatar({
  organization,
  className = 'size-12 text-xs',
}: {
  organization: Organization
  className?: string
}) {
  const logo = organization.assets?.find((asset) =>
    /logo|icon/i.test(asset.type),
  )
  const theme = themeFor(organization.tags)
  const colors: Record<Theme, string> = {
    tech: 'bg-[#ece8db] text-[#59472d]',
    outdoors: 'bg-[#dfe8d9] text-[#344f39]',
    film: 'bg-[#ecdfdc] text-[#643e36]',
    art: 'bg-[#e7e1ef] text-[#524368]',
  }

  return (
    <span
      aria-hidden="true"
      className={`inline-grid shrink-0 place-items-center overflow-hidden rounded-lg font-bold ${className}${logo ? ' border border-line bg-white' : ` ${colors[theme]}`}`}
    >
      {logo ? (
        <img
          src={logo.link}
          alt=""
          className="size-full object-contain p-0.5"
        />
      ) : (
        organization.name
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0])
          .join('')
          .toUpperCase()
      )}
    </span>
  )
}
