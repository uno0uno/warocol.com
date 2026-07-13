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

  const authStore = useAuthStore()
  const tenantsStore = useTenantsStore()

  const profileLoaded = computed(() => Boolean(authStore.sessionProfile))
  const profileLocale = computed<AppLocaleCode | null>(() =>
    normalizeEnabledAppLocale(authStore.preferredLocale),
  )

  const tenantLocale = computed<AppLocaleCode | null>(() => {
    if (!tenantsStore.selectedTenant) return null
    return normalizeEnabledAppLocale(tenantsStore.selectedTenant.ui_locale)
      ?? DEFAULT_APP_LOCALE
  })

  function resolvePreferredLocale(): AppLocaleCode {
    return resolveAppLocale({
      profileValue: authStore.preferredLocale,
      tenantValue: tenantsStore.selectedTenant?.ui_locale,
      cookieValue: cookie.value,
      profileLoaded: profileLoaded.value,
      tenantLoaded: Boolean(tenantsStore.selectedTenant),
    })
  }

  async function applyLocale(
    code: AppLocaleCode,
    options?: { persist?: boolean, respectPersonal?: boolean },
  ) {
    const requested = normalizeEnabledAppLocale(code) ?? DEFAULT_APP_LOCALE
    const next = options?.respectPersonal === false
      ? requested
      : profileLocale.value ?? requested
    const persist = options?.persist !== false
    if (persist) cookie.value = next
    if (locale.value !== next) {
      await setLocale(next)
    }
  }

  async function syncFromSources() {
    await applyLocale(resolvePreferredLocale(), {
      persist: true,
      respectPersonal: false,
    })
  }

  /** Apply a tenant setting without overriding an existing personal preference. */
  async function applyTenantLocale(code: AppLocaleCode) {
    await applyLocale(code, { persist: true })
  }

  /** Preview/persist an explicit personal choice, even before the API responds. */
  async function applyPersonalLocale(code: AppLocaleCode) {
    await applyLocale(code, { persist: true, respectPersonal: false })
  }

  async function syncAuthenticatedLocale(sessionData?: any) {
    if (sessionData) authStore.hydrateSession(sessionData)
    else await authStore.refreshSession()

    if (!profileLocale.value && !tenantsStore.selectedTenant && import.meta.client) {
      try {
        await tenantsStore.fetchUserTenants()
        await nextTick()
      } catch {
        // Tenant middleware will retry after navigation.
      }

      if (!tenantsStore.selectedTenant) {
        await applyPersonalLocale(DEFAULT_APP_LOCALE)
        return authStore.session
      }
    }

    await syncFromSources()
    return authStore.session
  }

  return {
    locale: computed(() => (normalizeEnabledAppLocale(locale.value) ?? DEFAULT_APP_LOCALE)),
    availableLocales: APP_LOCALES,
    profileLocale,
    tenantLocale,
    resolvePreferredLocale,
    syncFromSources,
    applyTenantLocale,
    applyPersonalLocale,
    applyLocale,
    syncAuthenticatedLocale,
    t,
    te,
  }
}
