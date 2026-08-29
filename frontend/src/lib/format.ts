/** Display helpers. All input is treated as untrusted text — never as HTML. */

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const DATETIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return DATE_FORMAT.format(date)
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return DATETIME_FORMAT.format(date)
}

/** `YYYY-MM-DD` — the format Django's DateField expects and `<input type=date>` uses. */
export function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function today(): string {
  return toISODate(new Date())
}

export function addDays(days: number, from: Date = new Date()): string {
  const date = new Date(from)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

/** Whole days from today; negative when the date is in the past. */
export function daysFromToday(value: string | null | undefined): number | null {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  return Math.round((date.getTime() - start.getTime()) / 86_400_000)
}

/** "in 3 days" / "2 days ago" / "today". */
export function relativeDays(value: string | null | undefined): string {
  const diff = daysFromToday(value)
  if (diff === null) return '—'
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff === -1) return 'yesterday'
  return diff > 0 ? `in ${diff} days` : `${Math.abs(diff)} days ago`
}

/** Human age from a date of birth, or a year-only approximation. */
export function petAge(
  dateOfBirth: string | null | undefined,
  birthYear: number | null | undefined,
): string {
  if (dateOfBirth) {
    const dob = new Date(`${dateOfBirth}T00:00:00`)
    if (!Number.isNaN(dob.getTime())) {
      const now = new Date()
      let years = now.getFullYear() - dob.getFullYear()
      let months = now.getMonth() - dob.getMonth()
      if (now.getDate() < dob.getDate()) months -= 1
      if (months < 0) {
        years -= 1
        months += 12
      }
      if (years < 0) return '—'
      if (years === 0) return `${months} mo`
      return months === 0 ? `${years} yr` : `${years} yr ${months} mo`
    }
  }
  if (birthYear) {
    const years = new Date().getFullYear() - birthYear
    return years >= 0 ? `~${years} yr` : '—'
  }
  return '—'
}

export function fullName(first: string, last: string): string {
  return `${first} ${last}`.trim() || '—'
}

export function initials(value: string): string {
  const parts = value.trim().split(/[\s@._-]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

/** Truncates long free-text for table cells without breaking mid-word. */
export function truncate(value: string, max = 80): string {
  if (!value) return ''
  if (value.length <= max) return value
  return `${value.slice(0, max).trimEnd()}…`
}

export function orDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  const text = String(value).trim()
  return text === '' ? '—' : text
}
