import { useFormatters } from '~/composables/useFormatters'

export interface CierrePeriodLike {
  status?: string
  periodStart?: string
  periodEnd?: string
  periodStartTime?: string | null
  periodEndTime?: string | null
  shiftTemplateId?: string | null
  shiftTemplateName?: string | null
}

export function useCierrePeriod() {
  const { formatCalendarDate } = useFormatters()
  const { timezone } = useTenantTimezone()
  const { t, locale } = useI18n({ useScope: 'global' })

  const timeFormatter = computed(() => new Intl.DateTimeFormat(toNumberLocaleTag(locale.value), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone.value,
  }))

  const hasTimeWindow = (cierre: CierrePeriodLike | null | undefined): boolean =>
    !!(cierre?.periodStartTime || cierre?.periodEndTime)

  const isTemplateCierre = (cierre: CierrePeriodLike | null | undefined): boolean =>
    !!(cierre?.shiftTemplateId && cierre?.shiftTemplateName)

  const formatPeriodDates = (cierre: CierrePeriodLike | null | undefined): string => {
    const start = cierre?.periodStart
    const end = cierre?.periodEnd
    if (!start) return ''
    const fmt = (d: string) => formatCalendarDate(d)
    return !end || start === end ? fmt(start) : `${fmt(start)} – ${fmt(end)}`
  }

  const formatPeriodTimes = (cierre: CierrePeriodLike | null | undefined): string | null => {
    if (!hasTimeWindow(cierre)) return null
    const start = cierre?.periodStartTime
    const end = cierre?.periodEndTime
    if (start && end) return `${timeFormatter.value.format(new Date(start))} – ${timeFormatter.value.format(new Date(end))}`
    if (start) return t('finanzas.arqueo.fromTime', { time: timeFormatter.value.format(new Date(start)) })
    if (end) return t('finanzas.arqueo.untilTime', { time: timeFormatter.value.format(new Date(end)) })
    return null
  }

  const isOpenCierre = (cierre: CierrePeriodLike | null | undefined): boolean =>
    cierre?.status === 'open'

  const periodTypeLabel = (cierre: CierrePeriodLike | null | undefined): string => {
    if (isOpenCierre(cierre)) return t('finanzas.arqueo.periodOpen')
    if (isTemplateCierre(cierre)) return cierre!.shiftTemplateName!
    if (hasTimeWindow(cierre)) return t('finanzas.arqueo.periodCustom')
    return t('finanzas.common.fullDay')
  }

  const periodBadgeClass = (cierre: CierrePeriodLike | null | undefined): string => {
    if (isOpenCierre(cierre)) return 'bg-state-success-bg text-state-success-text border border-state-success-border'
    if (isTemplateCierre(cierre)) return 'bg-primary/10 text-primary'
    if (hasTimeWindow(cierre)) return 'bg-state-info-bg text-state-info-text border border-state-info-border'
    return 'bg-surface-secondary text-text-secondary'
  }

  return {
    hasTimeWindow,
    isTemplateCierre,
    isOpenCierre,
    formatPeriodDates,
    formatPeriodTimes,
    periodTypeLabel,
    periodBadgeClass,
  }
}
