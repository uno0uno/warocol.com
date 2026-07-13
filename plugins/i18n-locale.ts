/**
 * Apply resolved UI locale on SSR + client so cookie `waro_locale=en`
 * does not flash Spanish HTML then hydrate to English.
 *
 * Must NOT call useI18n()/useAppLocale() here — vue-i18n requires component
 * setup context. Use nuxtApp.$i18n from the @nuxtjs/i18n plugin instead.
 *
 * SSR starts from the cache cookie. Once tenant data loads on the client,
 * selectedTenant.ui_locale is authoritative and refreshes that cookie.
 */
import {
  APP_LOCALE_COOKIE,
} from '~/composables/useAppLocale'
import {
  DEFAULT_APP_LOCALE,
  normalizeEnabledAppLocale,
  resolveAppLocale,
  type AppLocaleCode,
} from '~/utils/appLocales'

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
      return resolveAppLocale(undefined, cookie.value, false)
    }

    const apply = async (code: AppLocaleCode) => {
      if (i18n.locale.value !== code) {
        await i18n.setLocale(code)
      }
    }

    await apply(resolvePreferred())

    // The tenant list is client-hydrated and is the source of truth for every role.
    if (import.meta.client) {
      try {
        const tenantsStore = useTenantsStore()
        watch(
          () => [
            tenantsStore.selectedTenant?.id,
            tenantsStore.selectedTenant?.ui_locale,
          ] as const,
          async ([tenantId, raw]) => {
            if (!tenantId) return
            const next = normalizeEnabledAppLocale(raw) ?? DEFAULT_APP_LOCALE
            cookie.value = next
            await apply(next)
          },
          { immediate: true },
        )
      } catch {
        // ignore store watch if pinia unavailable
      }
    }
  },
})
