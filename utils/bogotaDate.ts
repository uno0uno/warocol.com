/** Business calendar dates/times for Colombia (America/Bogota). Issue #698 */

export const BOGOTA_TZ = 'America/Bogota'

type DateParts = {
  year: string
  month: string
  day: string
  hour: string
  minute: string
}

function bogotaParts(date: Date): DateParts {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: BOGOTA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  ) as Record<string, string>
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
  }
}

/** Today's calendar date in Bogotá as YYYY-MM-DD. */
export function todayBogotaISO(): string {
  const p = bogotaParts(new Date())
  return `${p.year}-${p.month}-${p.day}`
}

/** Calendar day in Bogotá for any instant (e.g. date-picker value). */
export function bogotaISOFromDate(date: Date): string {
  const p = bogotaParts(date)
  return `${p.year}-${p.month}-${p.day}`
}

/** Stable noon anchor for date pickers (avoids DST edge cases; Colombia has no DST). */
export function bogotaDateAtNoon(iso: string): Date {
  return new Date(`${iso}T12:00:00-05:00`)
}

/** ISO timestamp for API period_*_time params (Bogotá wall clock). */
export function combineBogotaDateAndTimeISO(iso: string, hhmm: string): string | null {
  if (!hhmm || hhmm.length < 5) return null
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  const hh = String(h).padStart(2, '0')
  const mm = String(m).padStart(2, '0')
  return `${iso}T${hh}:${mm}:00-05:00`
}

/** Add calendar days to a Bogotá ISO date string. */
export function addDaysBogotaISO(iso: string, days: number): string {
  const base = bogotaDateAtNoon(iso)
  const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000)
  return bogotaISOFromDate(next)
}

/** HH:mm in Bogotá from an ISO timestamp string. */
export function bogotaTimeHHMMFromISO(iso: string): string {
  const p = bogotaParts(new Date(iso))
  return `${p.hour}:${p.minute}`
}

/** First and last calendar day of the month containing `iso` (Bogotá). */
export function bogotaMonthBounds(iso?: string): { first: string; last: string } {
  const base = iso ?? todayBogotaISO()
  const [y, m] = base.split('-').map(Number)
  const first = `${y}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const last = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { first, last }
}
