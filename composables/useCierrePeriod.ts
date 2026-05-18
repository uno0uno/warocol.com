import { useFormatters } from '~/composables/useFormatters'

export interface CierrePeriodLike {
  periodStart?: string
  periodEnd?: string
  periodStartTime?: string | null
  periodEndTime?: string | null
  shiftTemplateId?: string | null
  shiftTemplateName?: string | null
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

  const isTemplateCierre = (cierre: CierrePeriodLike | null | undefined): boolean =>
    !!(cierre?.shiftTemplateId && cierre?.shiftTemplateName)

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

  const periodTypeLabel = (cierre: CierrePeriodLike | null | undefined): string => {
    if (isTemplateCierre(cierre)) return cierre!.shiftTemplateName!
    if (hasTimeWindow(cierre)) return 'Personalizado'
    return 'Día completo'
  }

  const periodBadgeClass = (cierre: CierrePeriodLike | null | undefined): string => {
    if (isTemplateCierre(cierre)) return 'bg-primary/10 text-primary'
    if (hasTimeWindow(cierre)) return 'bg-violet-50 text-violet-800 border border-violet-200'
    return 'bg-surface-secondary text-text-secondary'
  }

  return {
    hasTimeWindow,
    isTemplateCierre,
    formatPeriodDates,
    formatPeriodTimes,
    periodTypeLabel,
    periodBadgeClass,
  }
}
