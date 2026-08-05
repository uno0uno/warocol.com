import { computed } from 'vue'
import {
  formatMoney,
  formatMoneyThermal,
  normalizeCurrencyCode,
  type FormatMoneyOptions,
} from '~/utils/currencyDisplay'
import { toNumberLocaleTag } from '~/utils/appLocales'
import {
  DEFAULT_UI_LOCALE,
  formatLocaleNumber,
  normalizeUiLocale,
  type UiLocale,
} from '~/utils/parseLocaleDecimal'
import { useTenantTimezone } from '~/composables/useTenantTimezone'
import { useTenantFinancialProfile } from '~/composables/useTenantFinancialProfile'
import { useTenantsStore } from '~/stores/tenants'

export const useFormatters = () => {
  const { timezone, dateAtNoon } = useTenantTimezone()
  const tenantsStore = useTenantsStore()
  const {
    profile: financialProfile,
    currencyMinorUnits: financialCurrencyMinorUnits,
  } = useTenantFinancialProfile()
  const { locale: i18nLocale, t } = useI18n()

  /** Authoritative base currency; public display pref is a partial-rollout fallback only. */
  const currencyCode = computed(() =>
    normalizeCurrencyCode(
      financialProfile.value?.base_currency_code
      ?? tenantsStore.businessProfile?.currency_code,
    ),
  )

  const currencyMinorUnits = computed(() =>
    financialProfile.value ? financialCurrencyMinorUnits.value : 0,
  )

  /**
   * Active UI locale for number/date punctuation (cookie/i18n via useAppLocale plugin).
   * Maps to es-CO / en-US via toNumberLocaleTag; tenant timezone stays separate.
   */
  const uiLocale = computed<UiLocale>(() => normalizeUiLocale(i18nLocale.value))

  const numberLocaleTag = computed(() => toNumberLocaleTag(uiLocale.value))
  const dateLocaleTag = computed(() => toNumberLocaleTag(uiLocale.value))

  const dateFormatter = computed(() => new Intl.DateTimeFormat(dateLocaleTag.value, {
    day: '2-digit', month: '2-digit', year: '2-digit',
    timeZone: timezone.value,
  }))

  const dateTimeFormatter = computed(() => new Intl.DateTimeFormat(dateLocaleTag.value, {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: timezone.value,
  }))

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return t('common.notSpecified')
    return dateFormatter.value.format(new Date(dateString))
  }

  /** YYYY-MM-DD (or API date field) -> tenant calendar day. */
  const formatCalendarDate = (dateString: string | null | undefined): string => {
    if (!dateString) return t('common.notSpecified')
    const day = dateString.split('T')[0]
    if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      return dateFormatter.value.format(dateAtNoon(day))
    }
    return formatDate(dateString)
  }

  const formatDateShort = (dateString: string | null | undefined): string => {
    if (!dateString) return t('common.nA')
    return dateFormatter.value.format(new Date(dateString))
  }

  /** Display-only money; currency_code from prefs (default COP) + locale punctuation. */
  const formatCurrency = (
    value: number | string | null | undefined,
    options?: Pick<FormatMoneyOptions, 'notation'>,
  ): string => {
    return formatMoney(value, {
      currency: currencyCode.value,
      locale: uiLocale.value,
      minorUnits: currencyMinorUnits.value,
      notation: options?.notation,
    })
  }

  /**
   * Money with a spaced explicit sign (`− MXN 550,00`).
   * Intl puts a tight `-` before the currency code, which readers miss on
   * arqueo screens where a negative amount changes the meaning of the row.
   */
  const formatCurrencySigned = (
    value: number | string | null | undefined,
  ): string => {
    const amount = Number(value ?? 0)
    if (!Number.isFinite(amount) || amount === 0) return formatCurrency(0)
    return `${amount < 0 ? '−' : '+'} ${formatCurrency(Math.abs(amount))}`
  }

  /** Thermal / ESC/POS tickets — ISO code + ASCII amount (#1965). */
  const formatCurrencyThermal = (
    value: number | string | null | undefined,
  ): string => {
    return formatMoneyThermal(value, {
      currency: currencyCode.value,
      locale: uiLocale.value,
      minorUnits: currencyMinorUnits.value,
    })
  }

  const formatNumber = (
    value: number | null | undefined,
    options?: { minimumFractionDigits?: number; maximumFractionDigits?: number },
  ): string => {
    if (value === null || value === undefined || !Number.isFinite(value)) return ''
    return formatLocaleNumber(value, uiLocale.value, options)
  }

  const formatDateTime = (dateString: string | null | undefined): string => {
    if (!dateString) return t('common.notSpecified')
    return dateTimeFormatter.value.format(new Date(dateString))
  }

  const formatRelativeDate = (dateString: string): string => {
    const diff = (new Date(dateString).getTime() - Date.now()) / 1000
    const rtf = new Intl.RelativeTimeFormat(dateLocaleTag.value, { numeric: 'auto' })
    const abs = Math.abs(diff)
    if (abs < 60)   return rtf.format(Math.round(diff), 'second')
    if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
    if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
    if (abs < 2592000) return rtf.format(Math.round(diff / 86400), 'day')
    if (abs < 31536000) return rtf.format(Math.round(diff / 2592000), 'month')
    return rtf.format(Math.round(diff / 31536000), 'year')
  }

  return {
    uiLocale,
    currencyCode,
    currencyMinorUnits,
    numberLocaleTag,
    dateLocaleTag,
    defaultUiLocale: DEFAULT_UI_LOCALE,
    formatDate,
    formatCalendarDate,
    formatDateShort,
    formatCurrency,
    formatCurrencySigned,
    formatCurrencyThermal,
    formatNumber,
    formatDateTime,
    formatRelativeDate,
  }
}
