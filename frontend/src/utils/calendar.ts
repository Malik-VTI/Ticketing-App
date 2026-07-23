// Calendar helpers: build .ics files and Google Calendar "add event" links.
// Fully client-side — no API key, no OAuth, no external dependency.

export interface CalendarEvent {
  uid: string
  title: string
  description?: string
  location?: string
  // Timed events: pass ISO datetime strings (e.g. "2026-07-24T06:00:00+07:00").
  // All-day events: pass calendar dates as "YYYY-MM-DD".
  start: string
  end: string
  allDay: boolean
}

const pad = (n: number): string => String(n).padStart(2, '0')

// ISO datetime -> UTC basic format used by iCal / Google: 20260723T230000Z
const toICSDateTime = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}

// "YYYY-MM-DD" -> "20260724" (all-day DTEND is exclusive, matching hotel checkout)
const toICSDate = (ymd: string): string => ymd.replace(/-/g, '')

// Escape a value for an ICS text field (RFC 5545 §3.3.11)
const escapeICS = (text: string): string =>
  text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')

const dtStamp = (): string => toICSDateTime(new Date().toISOString())

export const buildICS = (events: CalendarEvent[]): string => {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ticketing-app//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]
  for (const ev of events) {
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${ev.uid}`)
    lines.push(`DTSTAMP:${dtStamp()}`)
    if (ev.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${toICSDate(ev.start)}`)
      lines.push(`DTEND;VALUE=DATE:${toICSDate(ev.end)}`)
    } else {
      lines.push(`DTSTART:${toICSDateTime(ev.start)}`)
      lines.push(`DTEND:${toICSDateTime(ev.end)}`)
    }
    lines.push(`SUMMARY:${escapeICS(ev.title)}`)
    if (ev.description) lines.push(`DESCRIPTION:${escapeICS(ev.description)}`)
    if (ev.location) lines.push(`LOCATION:${escapeICS(ev.location)}`)
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n') // RFC 5545 requires CRLF line breaks
}

export const downloadICS = (events: CalendarEvent[], filename: string): void => {
  const blob = new Blob([buildICS(events)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Opens Google Calendar's pre-filled "create event" screen. No auth required.
export const googleCalendarUrl = (ev: CalendarEvent): string => {
  const dates = ev.allDay
    ? `${toICSDate(ev.start)}/${toICSDate(ev.end)}`
    : `${toICSDateTime(ev.start)}/${toICSDateTime(ev.end)}`
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates,
    details: ev.description || '',
    location: ev.location || '',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
