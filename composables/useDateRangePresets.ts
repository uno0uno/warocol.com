import { ref, computed, type Ref } from 'vue'

export type DateRangeApi = { from: string | null; to: string | null }

const formatIsoShort = (iso: string) => {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year.slice(2)}`
}

export function useDateRangePresets(existing?: Ref<Date[] | null>) {
  const dateRangeDates = existing ?? ref<Date[] | null>(null)
  const { todayISO, addDaysISO, dateAtNoon, isoFromDate } = useTenantTimezone()

  const presetRange = (fromIso: string, toIso = todayISO()) => [dateAtNoon(fromIso), dateAtNoon(toIso)]
  const maxDate = computed(() => dateAtNoon(todayISO()))

  const presetDates = computed(() => [
    { label: 'Hoy', value: presetRange(todayISO()) },
    {
      label: 'Ayer',
      value: presetRange(addDaysISO(todayISO(), -1), addDaysISO(todayISO(), -1)),
    },
    {
      label: 'Última semana',
      value: presetRange(addDaysISO(todayISO(), -7)),
    },
    {
      label: 'Últimos 15 días',
      value: presetRange(addDaysISO(todayISO(), -15)),
    },
    {
      label: 'Último mes',
      value: presetRange(addDaysISO(todayISO(), -30)),
    },
    {
      label: 'Últimos 90 días',
      value: presetRange(addDaysISO(todayISO(), -90)),
    },
  ])

  const formatDateRange = (dates: Date[]) => {
    if (!dates || !dates[0]) return ''
    const from = formatIsoShort(isoFromDate(dates[0]))
    if (!dates[1]) return from
    const to = formatIsoShort(isoFromDate(dates[1]))
    return `${from} - ${to}`
  }

  const dateRange = computed<DateRangeApi>(() => {
    if (!dateRangeDates.value || dateRangeDates.value.length < 2) {
      return { from: null, to: null }
    }
    const [from, to] = dateRangeDates.value
    if (!from || !to) return { from: null, to: null }
    return {
      from: isoFromDate(from),
      to: isoFromDate(to),
    }
  })

  const clearDateRange = () => {
    dateRangeDates.value = null
  }

  return {
    dateRangeDates,
    presetDates,
    maxDate,
    formatDateRange,
    dateRange,
    clearDateRange,
  }
}
