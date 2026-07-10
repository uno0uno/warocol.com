/**
 * Apply resolved UI locale on SSR + client so cookie `waro_locale=en`
 * does not flash Spanish HTML then hydrate to English.
 * Cookie override wins; otherwise tenant locale (B1) when present; else es.
 */
import { APP_LOCALE_COOKIE } from '~/composables/useAppLocale'

export default defineNuxtPlugin({
  name: 'waro-i18n-locale',
  // After @nuxtjs/i18n so useI18n()/setLocale are available.
  enforce: 'post',
  async setup() {
    const { syncFromSources, tenantLocale, applyLocale } = useAppLocale()
    const cookie = useCookie<string | null>(APP_LOCALE_COOKIE)

    await syncFromSources()

    // Tenant profile is client-hydrated; only watch after mount.
    if (import.meta.client) {
      watch(
        tenantLocale,
        async (next) => {
          if (!next) return
          if (cookie.value === 'es' || cookie.value === 'en') return
          await applyLocale(next, { persist: false })
        },
      )
    }
  },
})
