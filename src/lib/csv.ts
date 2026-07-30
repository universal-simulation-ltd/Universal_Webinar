import type { CustomQuestion } from './customQuestions'
import type { RegistrationRow, WebinarRow } from './database.types'

// Escape a single CSV cell per RFC 4180: wrap in double quotes and double any
// embedded quotes. We always quote so commas, newlines and leading =/+/-/@
// (spreadsheet formula-injection vectors) can't break the row or be executed.
function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}

export function buildRegistrationsCsv(
  registrations: RegistrationRow[],
  questions: CustomQuestion[] = [],
): string {
  // The three email stamps sit together so a host scanning the sheet can see
  // the whole lifecycle of one registrant — invite, nudge, follow-up — on a
  // single row. Reminders collapse to whichever slot fired last: the 24h and 1h
  // nudges are the same email to the host's eye, and two more columns that are
  // usually blank costs more than it tells them.
  const header = [
    'Name',
    'Email',
    'Registered at',
    'Confirmation emailed',
    'Reminder emailed',
    'Follow-up emailed',
    ...questions.map((q) => q.label),
  ]
  const rows = registrations.map((r) => {
    const ans = r.custom_answers ?? {}
    const remindedAt = r.reminder_1h_sent_at ?? r.reminder_24h_sent_at
    return [
      r.name ?? '',
      r.email ?? '',
      new Date(r.registered_at).toISOString(),
      r.confirmation_sent_at
        ? new Date(r.confirmation_sent_at).toISOString()
        : '',
      remindedAt ? new Date(remindedAt).toISOString() : '',
      r.followup_sent_at ? new Date(r.followup_sent_at).toISOString() : '',
      ...questions.map((q) => ans[q.id] ?? ''),
    ]
      .map((v) => csvCell(String(v)))
      .join(',')
  })
  // Prepend a UTF-8 BOM so Excel opens accented names correctly.
  return '﻿' + [header.map(csvCell).join(','), ...rows].join('\r\n')
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
