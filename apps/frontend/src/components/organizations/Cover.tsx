import { mediaUrl } from '../../lib/platform'
import type { Organization } from '../../types'
import type { Theme } from './theme'
import { themeFor } from './theme'

const coverColors: Record<Theme, [string, string]> = {
  tech: ['#ece8db', '#a78d63'],
  outdoors: ['#dfe8d9', '#64836a'],
  film: ['#ecdfdc', '#ab7369'],
  art: ['#e7e1ef', '#8d79a5'],
}

export function Cover({
  organization,
  large = false,
}: {
  organization: Organization
  large?: boolean
}) {
  const banner = organization.assets?.find((asset) =>
    /banner|cover/i.test(asset.type),
  )
  if (banner)
    return (
      <img
        src={mediaUrl(banner.link)}
        alt=""
        className={`block w-full object-cover ${large ? 'h-40 sm:h-48' : 'h-28'}`}
      />
    )
  const theme = themeFor(organization.tags)
  const [background, foreground] = coverColors[theme]

  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden ${large ? 'h-40 sm:h-48' : 'h-28'}`}
      style={{ backgroundColor: background }}
    >
      <svg
        viewBox="0 0 280 130"
        preserveAspectRatio="xMidYMid slice"
        className="absolute right-0 h-full w-3/4"
        stroke={foreground}
        strokeWidth="1.25"
        fill="none"
      >
        {theme === 'tech' &&
          [0, 1, 2, 3, 4].map((i) => (
            <path
              key={i}
              d={`M${118 + i * 22} -12 L${267 + i * 22} 68 L${118 + i * 22} 148 L${-31 + i * 22} 68Z`}
            />
          ))}
        {theme === 'outdoors' &&
          [0, 1, 2, 3, 4].map((i) => (
            <path
              key={i}
              d={`M-30 ${110 + i * 10} Q42 ${-37 + i * 10} 108 ${44 + i * 10}T310 ${34 + i * 10}`}
            />
          ))}
        {theme === 'film' &&
          [0, 1, 2, 3, 4, 5].map((i) => (
            <circle key={i} cx="204" cy="73" r={23 + i * 14} />
          ))}
        {theme === 'art' &&
          [0, 1, 2, 3, 4].map((i) => (
            <rect
              key={i}
              x={90 + i * 20}
              y={8 + i * 9}
              width="120"
              height="84"
              transform={`rotate(${8 + i * 12} 180 68)`}
            />
          ))}
      </svg>
    </div>
  )
}
