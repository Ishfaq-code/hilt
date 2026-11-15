import type { Organization } from '../../types'
import type { ManagedEvent } from '../../types/management'

export const eventKinds = {
  rsvp: {
    label: 'Your RSVPs',
    dot: 'bg-sky-700',
    chip: 'bg-sky-100 text-sky-900',
  },
  joined: {
    label: 'Your club events',
    dot: 'bg-emerald-700',
    chip: 'bg-emerald-100 text-emerald-900',
  },
  other: {
    label: 'Other club events',
    dot: 'bg-stone-500',
    chip: 'bg-stone-100 text-stone-800',
  },
} as const

export type CalendarEntry = {
  club: Pick<Organization, '_id' | 'name' | 'tags'>
  event: ManagedEvent
  kind: keyof typeof eventKinds
}

export function dateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return date.getFullYear() + '-' + month + '-' + day
}

export function entriesByDay(entries: CalendarEntry[]) {
  const days = new Map<string, CalendarEntry[]>()
  for (const entry of entries) {
    const key = dateKey(new Date(entry.event.startDatetime))
    const current = days.get(key)
    if (current) current.push(entry)
    else days.set(key, [entry])
  }
  return days
}
