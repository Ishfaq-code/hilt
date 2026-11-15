import { api } from './api'
import { eventApi } from './events'

export type CheckIn = {
  checkedInAt: string
  method: 'self' | 'event-qr' | 'staff-manual' | 'attendee-qr'
  hadRsvp: boolean
}

const attendeePrefix = 'hilt:attendee:'

export function attendeeQrValue(code: string) {
  return attendeePrefix + code
}

export function readAttendeeQr(value: string) {
  if (!value.startsWith(attendeePrefix))
    throw new Error('Scan an attendee QR code.')
  return value.slice(attendeePrefix.length)
}

export function eventQrValue(clubId: string, eventId: string, code: string) {
  const query = new URLSearchParams({ club: clubId, event: eventId, code })
  return new URL('/scan?' + query, window.location.origin).href
}

export function readEventQr(value: string) {
  const url = URL.parse(value)
  if (url?.origin !== window.location.origin || url.pathname !== '/scan') {
    throw new Error('Scan an event QR code.')
  }
  return eventCheckInParameters(url.searchParams)
}

export function eventCheckInParameters(query: URLSearchParams) {
  const clubId = query.get('club')
  const eventId = query.get('event')
  const code = query.get('code')
  if (!clubId || !eventId || !code)
    throw new Error('This event QR code is invalid.')
  return { clubId, eventId, code }
}

export function checkIn(clubId: string, eventId: string, code?: string) {
  return api<CheckIn>(eventApi(clubId, eventId) + '/check-in', {
    method: 'POST',
    body: JSON.stringify({ method: code ? 'event-qr' : 'self', code }),
  })
}
