import {
  addDaysISO,
  combineDateAndTimeISO,
  dateAtEndOfDay,
  dateAtNoon,
  DEFAULT_TENANT_TIMEZONE,
  isoFromDate,
  monthBounds,
  normalizeTimezone,
  timeHHMMFromISO,
  todayISO,
  zonedParts,
} from '~/utils/bogotaDate'

export function useTenantTimezone() {
  const tenantsStore = useTenantsStore()
  const timezone = computed(() => normalizeTimezone(tenantsStore.businessProfile?.timezone))

  return {
    timezone,
    defaultTimezone: DEFAULT_TENANT_TIMEZONE,
    normalizeTimezone,
    todayISO: (now?: Date) => todayISO(timezone.value, now),
    isoFromDate: (date: Date) => isoFromDate(date, timezone.value),
    dateAtNoon: (iso: string) => dateAtNoon(iso, timezone.value),
    dateAtEndOfDay: (iso: string) => dateAtEndOfDay(iso, timezone.value),
    combineDateAndTimeISO: (iso: string, hhmm: string) => combineDateAndTimeISO(iso, hhmm, timezone.value),
    addDaysISO: (iso: string, days: number) => addDaysISO(iso, days, timezone.value),
    timeHHMMFromISO: (iso: string) => timeHHMMFromISO(iso, timezone.value),
    monthBounds: (iso?: string) => monthBounds(iso, timezone.value),
    zonedParts: (date: Date) => zonedParts(date, timezone.value),
  }
}
