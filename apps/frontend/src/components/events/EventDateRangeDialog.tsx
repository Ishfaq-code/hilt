import { useState } from 'react'
import { dateKey } from './calendarEntries'
import { Dialog } from '../ui/Dialog'
import { Icon } from '../ui/Icon'
import { buttonClass, secondaryClass } from '../ui/styles'

export function EventDateRangeDialog({
  from,
  to,
  onApply,
  onClose,
}: {
  from?: string | null
  to?: string | null
  onApply: (from: string, to: string) => void
  onClose: () => void
}) {
  const [start, setStart] = useState(from || '')
  const [end, setEnd] = useState(to || '')
  const [month, setMonth] = useState(
    () => new Date((from || dateKey(new Date())) + 'T12:00:00'),
  )

  function selectDay(day: string) {
    if (!start || end) {
      setStart(day)
      setEnd('')
    } else if (day < start) {
      setStart(day)
      setEnd(start)
    } else {
      setEnd(day)
    }
  }

  return (
    <Dialog title="Choose dates" onClose={onClose}>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          className={secondaryClass + ' size-9 p-0!'}
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }
        >
          <Icon name="back" size={16} />
        </button>
        <p role="status" className="text-sm text-muted">
          {!start
            ? 'Select a start date'
            : !end
              ? 'Select an end date'
              : 'Range selected'}
        </p>
        <button
          type="button"
          aria-label="Next month"
          className={secondaryClass + ' size-9 p-0!'}
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
          }
        >
          <Icon name="arrow" size={16} />
        </button>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {[0, 1].map((offset) => {
          const first = new Date(
            month.getFullYear(),
            month.getMonth() + offset,
            1,
          )
          const count = new Date(
            first.getFullYear(),
            first.getMonth() + 1,
            0,
          ).getDate()
          const title = first.toLocaleDateString(undefined, {
            month: 'long',
            year: 'numeric',
          })

          return (
            <section
              key={offset}
              aria-label={title}
              className={offset ? 'hidden sm:block' : ''}
            >
              <h3 className="mb-3 text-center text-sm font-semibold">
                {title}
              </h3>
              <div className="grid grid-cols-7 text-center">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                  <span key={day} className="py-2 text-xs text-muted">
                    {day}
                  </span>
                ))}
                {Array.from({ length: first.getDay() }, (_, index) => (
                  <span key={'blank-' + index} />
                ))}
                {Array.from({ length: count }, (_, index) => {
                  const day = new Date(
                    first.getFullYear(),
                    first.getMonth(),
                    index + 1,
                  )
                  const key = dateKey(day)
                  const endpoint = key === start || key === end
                  const inRange = start && end && key > start && key < end

                  return (
                    <button
                      key={key}
                      type="button"
                      aria-label={day.toLocaleDateString(undefined, {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      aria-pressed={endpoint}
                      className={
                        'min-h-10 py-2 text-sm tabular-nums ' +
                        (endpoint
                          ? 'rounded-md bg-accent font-semibold text-white'
                          : inRange
                            ? 'bg-soft text-accent'
                            : 'rounded-md hover:bg-paper')
                      }
                      onClick={() => selectDay(key)}
                    >
                      {index + 1}
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
      <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
        <button type="button" className={secondaryClass} onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className={buttonClass}
          disabled={!start}
          onClick={() => onApply(start, end || start)}
        >
          Apply
        </button>
      </div>
    </Dialog>
  )
}
