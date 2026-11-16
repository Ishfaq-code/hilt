import { Icon } from '../ui/Icon'
import { buttonClass, secondaryClass } from '../ui/styles'

const labelMotion =
  'col-start-1 row-start-1 motion-safe:transition-[opacity,translate] motion-safe:duration-200'

export function RsvpButton({
  going,
  disabled,
  onClick,
}: {
  going: boolean | undefined
  disabled: boolean
  onClick: () => void
}) {
  if (going === undefined) return null

  return (
    <button
      type="button"
      className={
        (going ? secondaryClass : buttonClass) +
        ' motion-safe:transition-colors'
      }
      aria-label={going ? 'Cancel RSVP' : 'RSVP'}
      title={going ? 'Cancel RSVP' : undefined}
      disabled={disabled}
      onClick={onClick}
    >
      <span
        aria-hidden="true"
        className="grid items-center justify-items-center"
      >
        <span
          className={
            labelMotion + (going ? ' opacity-0 motion-safe:-translate-y-1' : '')
          }
        >
          RSVP
        </span>
        <span
          className={
            labelMotion +
            ' flex items-center gap-2 text-active' +
            (going ? '' : ' opacity-0 motion-safe:translate-y-1')
          }
        >
          <Icon name="check" size={16} />
          Going
        </span>
      </span>
    </button>
  )
}
