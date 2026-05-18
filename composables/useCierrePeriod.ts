import { useFormatters } from '~/composables/useFormatters'

export interface CierrePeriodLike {
  periodStart?: string
  periodEnd?: string
  periodStartTime?: string | null
  periodEndTime?: string | null
}

const _timeFormatter = new Intl.DateTimeFormat('es-CO', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'America/Bogota',
})

export function useCierrePeriod() {
  const { formatDate } = useFormatters()

  const hasTimeWindow = (cierre: CierrePeriodLike | null | undefined): boolean =>
    !!(cierre?.periodStartTime || cierre?.periodEndTime)

  const formatPeriodDates = (cierre: CierrePeriodLike | null | undefined): string => {
    const start = cierre?.periodStart
    const end = cierre?.periodEnd
    if (!start) return ''
    const fmt = (d: string) => formatDate(d + 'T12:00:00')
    return !end || start === end ? fmt(start) : `${fmt(start)} – ${fmt(end)}`
  }

  const formatPeriodTimes = (cierre: CierrePeriodLike | null | undefined): string | null => {
    if (!hasTimeWindow(cierre)) return null
    const start = cierre?.periodStartTime
    const end = cierre?.periodEndTime
    if (start && end) return `${_timeFormatter.format(new Date(start))} – ${_timeFormatter.format(new Date(end))}`
    if (start) return `Desde ${_timeFormatter.format(new Date(start))}`
    if (end) return `Hasta ${_timeFormatter.format(new Date(end))}`
    return null
  }

  const periodTypeLabel = (cierre: CierrePeriodLike | null | undefined): string =>
    hasTimeWindow(cierre) ? 'Por horario' : 'Día completo'

  return {
    hasTimeWindow,
    formatPeriodDates,
    formatPeriodTimes,
    periodTypeLabel,
  }
}
