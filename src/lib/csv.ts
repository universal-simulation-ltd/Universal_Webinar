import type { CustomQuestion } from './customQuestions'
import type {
  AttendanceRow,
  RegistrationRow,
  WebinarRow,
} from './database.types'

// Escape a single CSV cell per RFC 4180: wrap in double quotes and double any
// embedded quotes. We always quote so commas, newlines and leading =/+/-/@
// (spreadsheet formula-injection vectors) can't break the row or be executed.
function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}

const iso = (value: string | null | undefined): string =>
  value ? new Date(value).toISOString() : ''

/**
 * The host's export of everyone connected to the webinar.
 *
 * `attendance` is optional so a caller without it still gets the registration
 * half — the RPC behind it is newer than the panel and can fail independently.
 * When it is supplied the sheet also gains the two things a host can't get any
 * other way: whether each registrant actually turned up, and the WALK-UPS —
 * people who joined without pre-registering (a forwarded link, a newsletter),
 * who are invisible in the registrations list because they were never in it.
 *
 * Attendance is matched on lowercased email, the same definition migration 0096
 * and the follow-up emailer use, so the sheet agrees with the panel.
 */
export function buildRegistrationsCsv(
  registrations: RegistrationRow[],
  questions: CustomQuestion[] = [],
  attendance: AttendanceRow[] = [],
): string {
  const attendedByEmail = new Map(
    attendance.map((a) => [a.email.toLowerCase(), a]),
  )
  const registeredEmails = new Set(
    registrations.map((r) => r.email.toLowerCase()),
  )
  const walkUps = attendance.filter(
    (a) => !registeredEmails.has(a.email.toLowerCase()),
  )

  // "Source" earns its place only once walk-up rows can appear below the
  // registrations — on a sheet where every row is a registrant it would be a
  // column of identical values.
  const withSource = walkUps.length > 0

  // The email stamps sit together so a host scanning the sheet can see the
  // whole lifecycle of one person — invite, nudge, follow-up — on a single row.
  // Reminders collapse to whichever slot fired last: the 24h and 1h nudges are
  // the same email to the host's eye, and two mostly-blank columns cost more
  // than they tell them.
  const header = [
    'Name',
    'Email',
    ...(withSource ? ['Source'] : []),
    'Registered at',
    'Joined at',
    'Left at',
    'Confirmation emailed',
    'Reminder emailed',
    'Follow-up emailed',
    ...questions.map((q) => q.label),
  ]

  const rows = registrations.map((r) => {
    const ans = r.custom_answers ?? {}
    const attended = attendedByEmail.get(r.email.toLowerCase())
    return [
      r.name ?? '',
      r.email ?? '',
      ...(withSource ? ['Registered'] : []),
      iso(r.registered_at),
      iso(attended?.first_joined_at),
      iso(attended?.last_left_at),
      iso(r.confirmation_sent_at),
      iso(r.reminder_1h_sent_at ?? r.reminder_24h_sent_at),
      iso(r.followup_sent_at),
      ...questions.map((q) => ans[q.id] ?? ''),
    ]
      .map((v) => csvCell(String(v)))
      .join(',')
  })

  // Walk-ups have no registration, so every registration-side cell is blank
  // rather than zero or "no" — the sheet shouldn't claim they were never
  // emailed when the truth is there was nothing to email them about.
  const walkUpRows = walkUps.map((a) =>
    [
      a.name ?? '',
      a.email ?? '',
      'Walk-up',
      '',
      iso(a.first_joined_at),
      iso(a.last_left_at),
      '',
      '',
      '',
      ...questions.map(() => ''),
    ]
      .map((v) => csvCell(String(v)))
      .join(','),
  )

  // Prepend a UTF-8 BOM so Excel opens accented names correctly.
  return (
    '﻿' +
    [header.map(csvCell).join(','), ...rows, ...walkUpRows].join('\r\n')
  )
}

export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// "acme-launch-registrations.csv" — slug keeps it filesystem-safe.
export function registrationsCsvFilename(webinar: WebinarRow): string {
  return `${webinar.slug}-registrations.csv`
}
