export const APP_LOCALE_COOKIE = 'waro_locale'
import {
  APP_LOCALES,
  DEFAULT_APP_LOCALE,
  normalizeEnabledAppLocale,
  resolveAppLocale,
  type AppLocaleCode,
} from '~/utils/appLocales'

/**
 * Component/setup-only composable (calls useI18n).
 * Do not use from Nuxt plugins — use nuxtApp.$i18n there instead.
 */
export function useAppLocale() {
  const { locale, setLocale, t, te } = useI18n()
  const cookie = useCookie<string | null>(APP_LOCALE_COOKIE, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    watch: true,
  })

  const tenantsStore = useTenantsStore()

  const tenantLocale = computed<AppLocaleCode | null>(() => {
    if (!tenantsStore.selectedTenant) return null
    return normalizeEnabledAppLocale(tenantsStore.selectedTenant.ui_locale)
      ?? DEFAULT_APP_LOCALE
  })

  function resolvePreferredLocale(): AppLocaleCode {
    return resolveAppLocale(
      tenantsStore.selectedTenant?.ui_locale,
      cookie.value,
      Boolean(tenantsStore.selectedTenant),
    )
  }

  async function applyLocale(code: AppLocaleCode, options?: { persist?: boolean }) {
    const next = normalizeEnabledAppLocale(code) ?? DEFAULT_APP_LOCALE
    const persist = options?.persist !== false
    if (persist) cookie.value = next
    if (locale.value !== next) {
      await setLocale(next)
    }
  }

  async function syncFromSources() {
    await applyLocale(resolvePreferredLocale(), { persist: false })
  }

  /** Apply the authoritative tenant locale and refresh the SSR cache cookie. */
  async function applyTenantLocale(code: AppLocaleCode) {
    await applyLocale(code, { persist: true })
  }

  return {
    locale: computed(() => (normalizeEnabledAppLocale(locale.value) ?? DEFAULT_APP_LOCALE)),
    availableLocales: APP_LOCALES,
    tenantLocale,
    resolvePreferredLocale,
    syncFromSources,
    applyTenantLocale,
    applyLocale,
    t,
    te,
  }
}
