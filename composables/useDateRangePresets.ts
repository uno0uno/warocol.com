import { ref, computed, type Ref } from 'vue'

export type DateRangeApi = { from: string | null; to: string | null }
export type DateRangeModel = Date[] | string[]

const formatIsoShort = (iso: string) => {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year.slice(2)}`
}

export function useDateRangePresets(
  existing?: Ref<DateRangeModel | null>,
  options: { modelType?: 'date' | 'iso' } = {},
) {
  const { t } = useI18n({ useScope: 'global' })
  const modelType = options.modelType ?? 'date'
  const dateRangeDates = existing ?? ref<DateRangeModel | null>(null)
  const { todayISO, addDaysISO, dateAtNoon, dateAtEndOfDay, isoFromDate } = useTenantTimezone()

  const presetValue = (iso: string) => modelType === 'iso' ? iso : dateAtNoon(iso)
  const presetRange = (fromIso: string, toIso = todayISO()) => [presetValue(fromIso), presetValue(toIso)]
  const maxDate = computed(() => modelType === 'iso' ? todayISO() : dateAtEndOfDay(todayISO()))

  const presetDates = computed(() => [
    { label: t('common.datePresets.today'), value: presetRange(todayISO()) },
    {
      label: t('common.datePresets.yesterday'),
      value: presetRange(addDaysISO(todayISO(), -1), addDaysISO(todayISO(), -1)),
    },
    {
      label: t('common.datePresets.lastWeek'),
      value: presetRange(addDaysISO(todayISO(), -7)),
    },
    {
      label: t('common.datePresets.last15'),
      value: presetRange(addDaysISO(todayISO(), -15)),
    },
    {
      label: t('common.datePresets.lastMonth'),
      value: presetRange(addDaysISO(todayISO(), -30)),
    },
    {
      label: t('common.datePresets.last90'),
      value: presetRange(addDaysISO(todayISO(), -90)),
    },
  ])

  const modelValueToIso = (value: Date | string) =>
    typeof value === 'string' ? value : isoFromDate(value)

  const formatDateRange = (dates: DateRangeModel) => {
    if (!dates || !dates[0]) return ''
    const from = formatIsoShort(modelValueToIso(dates[0]))
    if (!dates[1]) return from
    const to = formatIsoShort(modelValueToIso(dates[1]))
    return `${from} - ${to}`
  }

  const dateRange = computed<DateRangeApi>(() => {
    if (!dateRangeDates.value || dateRangeDates.value.length < 2) {
      return { from: null, to: null }
    }
    const [from, to] = dateRangeDates.value
    if (!from || !to) return { from: null, to: null }
    return {
      from: modelValueToIso(from),
      to: modelValueToIso(to),
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
