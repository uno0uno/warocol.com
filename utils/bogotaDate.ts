/** Tenant operational calendar helpers. Legacy Bogotá wrappers remain for old callers. */

export const DEFAULT_TENANT_TIMEZONE = 'America/Bogota'
export const BOGOTA_TZ = DEFAULT_TENANT_TIMEZONE

/** Mirror api_warocol.com/app/core/timezones.py COUNTRY_DEFAULT_TIMEZONES — warocol.com#1854/#1855. */
export const COUNTRY_DEFAULT_TIMEZONES: Record<string, string> = {
  CO: 'America/Bogota',
  PA: 'America/Panama',
  CL: 'America/Santiago',
  US: 'America/New_York',
  CA: 'America/Toronto',
  DO: 'America/Santo_Domingo',
  UY: 'America/Montevideo',
  AU: 'Australia/Sydney',
  NZ: 'Pacific/Auckland',
  SG: 'Asia/Singapore',
  AE: 'Asia/Dubai',
  AR: 'America/Argentina/Buenos_Aires',
  MX: 'America/Mexico_City',
  PE: 'America/Lima',
  CR: 'America/Costa_Rica',
  BR: 'America/Sao_Paulo',
  ES: 'Europe/Madrid',
  GB: 'Europe/London',
  DE: 'Europe/Berlin',
  FR: 'Europe/Paris',
  NL: 'Europe/Amsterdam',
  IN: 'Asia/Kolkata',
  CN: 'Asia/Shanghai',
}

export function defaultTimezoneForCountry(countryCode?: string | null): string {
  const code = String(countryCode || '').trim().toUpperCase()
  return COUNTRY_DEFAULT_TIMEZONES[code] || DEFAULT_TENANT_TIMEZONE
}

/**
 * Prefill Negocio timezone from country only when unset or still on the legacy
 * global default (so intentional overrides are kept).
 */
export function resolveTimezonePrefill(options: {
  storedTimezone?: string | null
  countryCode?: string | null
}): string {
  const stored = typeof options.storedTimezone === 'string' ? options.storedTimezone.trim() : ''
  if (stored && stored !== DEFAULT_TENANT_TIMEZONE) {
    return normalizeTimezone(stored)
  }
  return defaultTimezoneForCountry(options.countryCode)
}

export type DateParts = {
  year: string
  month: string
  day: string
  hour: string
  minute: string
  weekday?: string
}

const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>()
const dateTimeWeekdayFormatters = new Map<string, Intl.DateTimeFormat>()

export function normalizeTimezone(value?: string | null): string {
  const tz = typeof value === 'string' ? value.trim() : ''
  if (!tz) return DEFAULT_TENANT_TIMEZONE
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date())
    return tz
  } catch {
    return DEFAULT_TENANT_TIMEZONE
  }
}

function formatterFor(timezone: string, weekday = false): Intl.DateTimeFormat {
  const tz = normalizeTimezone(timezone)
  const cache = weekday ? dateTimeWeekdayFormatters : dateTimeFormatters
  const cached = cache.get(tz)
  if (cached) return cached
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    ...(weekday ? { weekday: 'short' as const } : {}),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  cache.set(tz, fmt)
  return fmt
}

export function zonedParts(date: Date, timezone = DEFAULT_TENANT_TIMEZONE): DateParts {
  const parts = Object.fromEntries(
    formatterFor(timezone, true).formatToParts(date).map((p) => [p.type, p.value]),
  ) as Record<string, string>
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    weekday: parts.weekday,
  }
}

export function todayISO(timezone = DEFAULT_TENANT_TIMEZONE, now = new Date()): string {
  const p = zonedParts(now, timezone)
  return `${p.year}-${p.month}-${p.day}`
}

export function isoFromDate(date: Date, timezone = DEFAULT_TENANT_TIMEZONE): string {
  const p = zonedParts(date, timezone)
  return `${p.year}-${p.month}-${p.day}`
}

function zonedWallTimeToDate(iso: string, hhmm: string, timezone = DEFAULT_TENANT_TIMEZONE): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || !hhmm || hhmm.length < 5) return null
  const [year, month, day] = iso.split('-').map(Number)
  const [hour, minute] = hhmm.slice(0, 5).split(':').map(Number)
  if ([year, month, day, hour, minute].some(Number.isNaN)) return null

  const targetWallUtc = Date.UTC(year, month - 1, day, hour, minute)
  let utc = targetWallUtc
  for (let i = 0; i < 3; i++) {
    const p = zonedParts(new Date(utc), timezone)
    const actualWallUtc = Date.UTC(
      Number(p.year),
      Number(p.month) - 1,
      Number(p.day),
      Number(p.hour),
      Number(p.minute),
    )
    const diff = targetWallUtc - actualWallUtc
    if (diff === 0) break
    utc += diff
  }
  return new Date(utc)
}

export function dateAtNoon(iso: string, timezone = DEFAULT_TENANT_TIMEZONE): Date {
  return zonedWallTimeToDate(iso, '12:00', timezone) ?? new Date(`${iso}T12:00:00-05:00`)
}

export function dateAtEndOfDay(iso: string, timezone = DEFAULT_TENANT_TIMEZONE): Date {
  const end = zonedWallTimeToDate(iso, '23:59', timezone)
  if (end) {
    end.setSeconds(59, 999)
    return end
  }
  return new Date(`${iso}T23:59:59.999-05:00`)
}

export function combineDateAndTimeISO(
  iso: string,
  hhmm: string,
  timezone = DEFAULT_TENANT_TIMEZONE,
): string | null {
  return zonedWallTimeToDate(iso, hhmm, timezone)?.toISOString() ?? null
}

export function addDaysISO(iso: string, days: number, timezone = DEFAULT_TENANT_TIMEZONE): string {
  const base = dateAtNoon(iso, timezone)
  const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000)
  return isoFromDate(next, timezone)
}

export function timeHHMMFromISO(iso: string, timezone = DEFAULT_TENANT_TIMEZONE): string {
  const p = zonedParts(new Date(iso), timezone)
  return `${p.hour}:${p.minute}`
}

export function monthBounds(iso?: string, timezone = DEFAULT_TENANT_TIMEZONE): { first: string; last: string } {
  const base = iso ?? todayISO(timezone)
  const [y, m] = base.split('-').map(Number)
  const first = `${y}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const last = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { first, last }
}

export const todayBogotaISO = () => todayISO(BOGOTA_TZ)
export const bogotaISOFromDate = (date: Date) => isoFromDate(date, BOGOTA_TZ)
export const bogotaDateAtNoon = (iso: string) => dateAtNoon(iso, BOGOTA_TZ)
export const bogotaDateAtEndOfDay = (iso: string) => dateAtEndOfDay(iso, BOGOTA_TZ)

export function combineBogotaDateAndTimeISO(iso: string, hhmm: string): string | null {
  if (!hhmm || hhmm.length < 5) return null
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  const hh = String(h).padStart(2, '0')
  const mm = String(m).padStart(2, '0')
  return `${iso}T${hh}:${mm}:00-05:00`
}

export const addDaysBogotaISO = (iso: string, days: number) => addDaysISO(iso, days, BOGOTA_TZ)
export const bogotaTimeHHMMFromISO = (iso: string) => timeHHMMFromISO(iso, BOGOTA_TZ)
export const bogotaMonthBounds = (iso?: string) => monthBounds(iso, BOGOTA_TZ)
