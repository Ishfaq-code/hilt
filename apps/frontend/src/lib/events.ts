import type { ManagedEvent } from '../types/management'
import { clubPreviewPath } from './clubs'

export function clubPath(clubId: string) {
  return '/organizations/' + encodeURIComponent(clubId)
}

export function eventPath(clubId: string, eventId: string) {
  return clubPreviewPath(clubId, eventId)
}

export function eventApi(clubId: string, eventId: string) {
  return '/api' + clubPath(clubId) + '/events/' + encodeURIComponent(eventId)
}

export function upcomingEvent(events: ManagedEvent[]) {
  const now = Date.now()
  return events.find((event) => Date.parse(event.startDatetime) >= now)
}
