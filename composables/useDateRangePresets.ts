import { ref, computed, type Ref } from 'vue'
import { es } from 'date-fns/locale'
import { format as fnsFormat } from 'date-fns'

export type DateRangeApi = { from: string | null; to: string | null }

export function useDateRangePresets(existing?: Ref<Date[] | null>) {
  const dateRangeDates = existing ?? ref<Date[] | null>(null)

  const presetDates = ref([
    { label: 'Hoy', value: [new Date(), new Date()] },
    {
      label: 'Ayer',
      value: (() => {
        const d = new Date()
        d.setDate(d.getDate() - 1)
        return [d, d]
      })(),
    },
    {
      label: 'Última semana',
      value: [(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d })(), new Date()],
    },
    {
      label: 'Últimos 15 días',
      value: [(() => { const d = new Date(); d.setDate(d.getDate() - 15); return d })(), new Date()],
    },
    {
      label: 'Último mes',
      value: [(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d })(), new Date()],
    },
    {
      label: 'Últimos 90 días',
      value: [(() => { const d = new Date(); d.setDate(d.getDate() - 90); return d })(), new Date()],
    },
  ])

  const formatDateRange = (dates: Date[]) => {
    if (!dates || !dates[0]) return ''
    const from = fnsFormat(dates[0], 'dd/MM/yy', { locale: es })
    if (!dates[1]) return from
    const to = fnsFormat(dates[1], 'dd/MM/yy', { locale: es })
    return `${from} - ${to}`
  }

  const dateRange = computed<DateRangeApi>(() => {
    if (!dateRangeDates.value || dateRangeDates.value.length < 2) {
      return { from: null, to: null }
    }
    const [from, to] = dateRangeDates.value
    if (!from || !to) return { from: null, to: null }
    return {
      from: fnsFormat(from, 'yyyy-MM-dd'),
      to: fnsFormat(to, 'yyyy-MM-dd'),
    }
  })

  const clearDateRange = () => {
    dateRangeDates.value = null
  }

  return {
    dateRangeDates,
    presetDates,
    formatDateRange,
    dateRange,
    clearDateRange,
  }
}
