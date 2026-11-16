import type { ManagedEvent } from '../types/management'
import { downloadFile } from './deviceShare'

function dateTime(value: string | number) {
  return new Date(value).toISOString().replace(/[-:]|\.\d{3}/g, '')
}

function text(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\n|\r/g, '\\n')
    .replace(/[;,]/g, '\\$&')
}

export function downloadEvent(event: ManagedEvent, url: string) {
  const calendar = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hilt//Events//EN',
    'BEGIN:VEVENT',
    'UID:' + event._id + '@' + new URL(url).hostname,
    'DTSTAMP:' + dateTime(Date.now()),
    'DTSTART:' + dateTime(event.startDatetime),
    'DTEND:' + dateTime(event.endDatetime),
    'SUMMARY:' + text(event.name),
    'DESCRIPTION:' + text(event.description ?? ''),
    'LOCATION:' + text(event.place ?? ''),
    'URL:' + url,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')
  return downloadFile(
    new Blob([calendar], { type: 'text/calendar;charset=utf-8' }),
    'event.ics',
  )
}
