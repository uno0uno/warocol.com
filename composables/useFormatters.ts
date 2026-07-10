import { formatMoney, normalizeCurrencyCode } from '~/utils/currencyDisplay'

export const useFormatters = () => {
  const { timezone, dateAtNoon } = useTenantTimezone()
  const tenantsStore = useTenantsStore()

  /** Display currency from tenant prefs (B1); missing → COP. */
  const currencyCode = computed(() =>
    normalizeCurrencyCode(tenantsStore.businessProfile?.currency_code),
  )
  /** Number-format locale pref when present; formatMoney defaults es-CO. */
  const currencyLocale = computed(() => tenantsStore.businessProfile?.locale ?? null)

  const dateFormatter = computed(() => new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    timeZone: timezone.value,
  }))

  const dateTimeFormatter = computed(() => new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: timezone.value,
  }))

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'No especificada'
    return dateFormatter.value.format(new Date(dateString))
  }

  /** YYYY-MM-DD (or API date field) -> tenant calendar day. */
  const formatCalendarDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'No especificada'
    const day = dateString.split('T')[0]
    if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      return dateFormatter.value.format(dateAtNoon(day))
    }
    return formatDate(dateString)
  }

  const formatDateShort = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A'
    return dateFormatter.value.format(new Date(dateString))
  }

  /** Display-only money; currency_code from prefs, default COP. See display-currency.md */
  const formatCurrency = (value: number | null): string => {
    return formatMoney(value, {
      currency: currencyCode.value,
      locale: currencyLocale.value,
    })
  }

  const formatDateTime = (dateString: string | null | undefined): string => {
    if (!dateString) return 'No especificada'
    return dateTimeFormatter.value.format(new Date(dateString))
  }

  const formatRelativeDate = (dateString: string): string => {
    const diff = (new Date(dateString).getTime() - Date.now()) / 1000
    const rtf = new Intl.RelativeTimeFormat('es-CO', { numeric: 'auto' })
    const abs = Math.abs(diff)
    if (abs < 60)   return rtf.format(Math.round(diff), 'second')
    if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
    if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
    if (abs < 2592000) return rtf.format(Math.round(diff / 86400), 'day')
    if (abs < 31536000) return rtf.format(Math.round(diff / 2592000), 'month')
    return rtf.format(Math.round(diff / 31536000), 'year')
  }

  return {
    formatDate,
    formatCalendarDate,
    formatDateShort,
    formatCurrency,
    formatDateTime,
    formatRelativeDate,
  }
}
