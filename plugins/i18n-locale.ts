/**
 * Apply resolved UI locale on SSR + client so cookie `waro_locale=en`
 * does not flash Spanish HTML then hydrate to English.
 *
 * Must NOT call useI18n()/useAppLocale() here — vue-i18n requires component
 * setup context. Use nuxtApp.$i18n from the @nuxtjs/i18n plugin instead.
 *
 * Order: cookie override → tenant locale (B1, client) → es.
 */
import {
  APP_LOCALE_COOKIE,
  DEFAULT_APP_LOCALE,
  normalizeAppLocale,
  type AppLocaleCode,
} from '~/composables/useAppLocale'

export default defineNuxtPlugin({
  name: 'waro-i18n-locale',
  // Prefer dependsOn when the i18n plugin id is registered; enforce post as fallback.
  dependsOn: ['i18n:plugin'],
  enforce: 'post',
  async setup(nuxtApp) {
    const i18n = nuxtApp.$i18n as {
      locale: { value: string }
      setLocale: (code: string) => Promise<void> | void
    }

    if (!i18n?.setLocale) {
      return
    }

    const cookie = useCookie<string | null>(APP_LOCALE_COOKIE, {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      watch: true,
    })

    const resolvePreferred = (): AppLocaleCode => {
      const fromCookie = normalizeAppLocale(cookie.value)
      if (fromCookie) return fromCookie

      if (import.meta.client) {
        try {
          const tenantsStore = useTenantsStore()
          const fromTenant = normalizeAppLocale(tenantsStore.businessProfile?.locale)
          if (fromTenant) return fromTenant
        } catch {
          // Pinia/store not ready — fall through to default.
        }
      }

      return DEFAULT_APP_LOCALE
    }

    const apply = async (code: AppLocaleCode) => {
      if (i18n.locale.value !== code) {
        await i18n.setLocale(code)
      }
    }

    await apply(resolvePreferred())

    // Tenant profile is client-hydrated; follow B1 locale only when no cookie override.
    if (import.meta.client) {
      try {
        const tenantsStore = useTenantsStore()
        watch(
          () => tenantsStore.businessProfile?.locale,
          async (raw) => {
            const next = normalizeAppLocale(raw)
            if (!next) return
            if (cookie.value === 'es' || cookie.value === 'en') return
            await apply(next)
          },
        )
      } catch {
        // ignore store watch if pinia unavailable
      }
    }
  },
})
