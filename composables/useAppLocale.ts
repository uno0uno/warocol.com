/**
 * App UI locale resolver (B4 shell i18n).
 *
 * Order: explicit cookie override → tenant businessProfile.locale (B1 when present) → es.
 * Only es | en. Prefer cookie so choice survives reload before B1 lands.
 */
export type AppLocaleCode = 'es' | 'en'

export const APP_LOCALE_COOKIE = 'waro_locale'
export const APP_LOCALES: readonly AppLocaleCode[] = ['es', 'en'] as const
export const DEFAULT_APP_LOCALE: AppLocaleCode = 'es'

export function normalizeAppLocale(value: unknown): AppLocaleCode | null {
  if (value === 'es' || value === 'en') return value
  return null
}

export function useAppLocale() {
  const { locale, setLocale, t, te } = useI18n()
  const cookie = useCookie<string | null>(APP_LOCALE_COOKIE, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    watch: true,
  })

  const tenantsStore = useTenantsStore()

  const tenantLocale = computed(() =>
    normalizeAppLocale(tenantsStore.businessProfile?.locale),
  )

  function resolvePreferredLocale(): AppLocaleCode {
    const fromCookie = normalizeAppLocale(cookie.value)
    if (fromCookie) return fromCookie
    if (tenantLocale.value) return tenantLocale.value
    return DEFAULT_APP_LOCALE
  }

  async function applyLocale(code: AppLocaleCode, options?: { persist?: boolean }) {
    const next = normalizeAppLocale(code) ?? DEFAULT_APP_LOCALE
    const persist = options?.persist !== false
    if (persist) cookie.value = next
    if (locale.value !== next) {
      await setLocale(next)
    }
  }

  async function syncFromSources() {
    await applyLocale(resolvePreferredLocale(), { persist: false })
  }

  /** User-driven switch (persists cookie). */
  async function setUserLocale(code: AppLocaleCode) {
    await applyLocale(code, { persist: true })
  }

  return {
    locale: computed(() => (normalizeAppLocale(locale.value) ?? DEFAULT_APP_LOCALE)),
    availableLocales: APP_LOCALES,
    tenantLocale,
    resolvePreferredLocale,
    syncFromSources,
    setUserLocale,
    applyLocale,
    t,
    te,
  }
}
