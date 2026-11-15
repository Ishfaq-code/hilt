import { Icon } from '../ui/Icon'
import { panelClass, secondaryClass } from '../ui/styles'
import { dateKey, eventKinds } from './calendarEntries'
import type { CalendarEntry } from './calendarEntries'

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const fullDate = {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
} as const

export function CalendarMonth({
  month,
  selected,
  byDay,
  discover,
  onMonth,
  onSelect,
  onOpen,
}: {
  month: Date
  selected: string
  byDay: Map<string, CalendarEntry[]>
  discover: boolean
  onMonth: (delta: number) => void
  onSelect: (key: string) => void
  onOpen: (entry: CalendarEntry) => void
}) {
  const offset = month.getDay()
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cellCount = Math.ceil((offset + count) / 7) * 7
  const keys = discover
    ? (['rsvp', 'joined', 'other'] as const)
    : (['rsvp', 'joined'] as const)

  return (
    <section
      aria-label="Event calendar"
      className={panelClass + ' @container min-w-0'}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-3 sm:px-5">
        <h3
          className="text-lg font-semibold tracking-tight sm:text-xl"
          aria-live="polite"
        >
          {month.toLocaleDateString(undefined, {
            month: 'long',
            year: 'numeric',
          })}
        </h3>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            aria-label="Previous month"
            className={secondaryClass + ' size-10 p-0!'}
            onClick={() => onMonth(-1)}
          >
            <Icon name="back" size={16} />
          </button>
          <button
            type="button"
            aria-label="Next month"
            className={secondaryClass + ' size-10 p-0!'}
            onClick={() => onMonth(1)}
          >
            <Icon name="arrow" size={16} />
          </button>
        </div>
      </div>
      <ul
        aria-label="Calendar key"
        className="flex flex-wrap gap-x-4 gap-y-2 px-3 pb-3 text-xs text-muted sm:px-5"
      >
        {keys.map((kind) => (
          <li key={kind} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={'size-2 rounded-full ' + eventKinds[kind].dot}
            />
            {eventKinds[kind].label}
          </li>
        ))}
      </ul>
      <div
        aria-hidden="true"
        className="grid grid-cols-7 border-y border-line bg-paper text-center"
      >
        {weekdays.map((day) => (
          <span key={day} className="py-2 text-xs font-semibold text-muted">
            {day}
          </span>
        ))}
      </div>
      <div className="grid auto-rows-fr grid-cols-7 gap-px overflow-hidden rounded-b-xl bg-line">
        {Array.from({ length: cellCount }, (_, index) => {
          const day = index - offset + 1
          if (day < 1 || day > count)
            return <div aria-hidden="true" key={index} className="bg-paper" />

          const date = new Date(month.getFullYear(), month.getMonth(), day)
          const key = dateKey(date)
          const active = key === selected
          const events = byDay.get(key) ?? []
          const dots = [...new Set(events.map(({ kind }) => kind))]

          return (
            <div
              key={index}
              className={
                'flex min-h-14 min-w-0 flex-col @sm:min-h-18 @xl:min-h-22 ' +
                (active ? 'bg-soft/65' : 'bg-white')
              }
            >
              <button
                type="button"
                aria-label={
                  date.toLocaleDateString(undefined, fullDate) +
                  ', ' +
                  events.length +
                  (events.length === 1 ? ' event' : ' events')
                }
                aria-pressed={active}
                onClick={() => onSelect(key)}
                className="flex w-full flex-1 flex-col items-center gap-1 p-1.5 text-sm hover:bg-ink/5 focus-visible:-outline-offset-2 @xl:items-start"
              >
                <span
                  className={
                    'grid size-7 place-items-center rounded-md tabular-nums ' +
                    (active ? 'bg-accent font-semibold text-white' : 'text-ink')
                  }
                >
                  {day}
                </span>
                {dots.length > 0 && (
                  <span aria-hidden="true" className="flex gap-0.5 @xl:hidden">
                    {dots.map((kind) => (
                      <span
                        key={kind}
                        className={
                          'size-1.5 rounded-full ' + eventKinds[kind].dot
                        }
                      />
                    ))}
                  </span>
                )}
              </button>
              {events.length > 0 && (
                <div className="hidden space-y-1 px-1 pb-2 @xl:block">
                  {events.slice(0, 2).map((entry) => (
                    <button
                      key={entry.club._id + ':' + entry.event._id}
                      type="button"
                      title={entry.event.name}
                      aria-haspopup="dialog"
                      onClick={() => onOpen(entry)}
                      className={
                        'block w-full truncate rounded px-1.5 py-1 text-left text-xs font-medium hover:underline ' +
                        eventKinds[entry.kind].chip
                      }
                    >
                      {entry.event.name}
                      <span className="sr-only">
                        {' '}
                        · {eventKinds[entry.kind].label}
                      </span>
                    </button>
                  ))}
                  {events.length > 2 && (
                    <button
                      type="button"
                      className="px-1 text-xs text-muted hover:underline"
                      onClick={() => onSelect(key)}
                    >
                      +{events.length - 2} more
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
