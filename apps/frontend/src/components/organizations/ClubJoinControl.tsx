import { Link } from 'react-router-dom'
import { myClubPath } from '../../lib/clubs'
import { Icon } from '../ui/Icon'
import { buttonClass } from '../ui/styles'

const labelMotion =
  'col-start-1 row-start-1 motion-safe:transition-[opacity,translate] motion-safe:duration-200'

export function ClubJoinControl({
  clubId,
  joined,
  busy,
  onJoin,
}: {
  clubId: string
  joined: boolean
  busy: boolean
  onJoin: () => void
}) {
  return (
    <div className="grid shrink-0 justify-items-end gap-1">
      <div className="grid min-h-10 items-center justify-items-end">
        <button
          type="button"
          disabled={joined || busy}
          aria-hidden={joined}
          aria-label={busy ? 'Joining…' : 'Interested'}
          onClick={onJoin}
          className={
            buttonClass +
            ' ' +
            labelMotion +
            (joined
              ? ' pointer-events-none opacity-0! motion-safe:-translate-y-1'
              : '')
          }
        >
          {busy ? 'Joining…' : 'Interested'}
        </button>
        <span
          role="status"
          aria-hidden={!joined}
          className={
            labelMotion +
            ' flex items-center gap-1.5 text-sm font-medium text-active' +
            (joined
              ? ''
              : ' pointer-events-none opacity-0 motion-safe:translate-y-1')
          }
        >
          <Icon name="check" size={16} />
          {joined ? 'Joined' : ''}
        </span>
      </div>
      <Link
        to={myClubPath(clubId)}
        aria-hidden={!joined}
        tabIndex={joined ? undefined : -1}
        className={
          'inline-flex h-5 items-center gap-1 text-xs text-muted hover:text-ink hover:underline hover:underline-offset-4 motion-safe:transition-opacity motion-safe:duration-150' +
          (joined ? ' motion-safe:delay-200' : ' pointer-events-none opacity-0')
        }
      >
        My clubs <span aria-hidden="true">→</span>
      </Link>
    </div>
  )
}
