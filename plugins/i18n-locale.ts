/**
 * Apply resolved UI locale on SSR + client so cookie `waro_locale=en`
 * does not flash Spanish HTML then hydrate to English.
 *
 * Must NOT call useI18n()/useAppLocale() here — vue-i18n requires component
 * setup context. Use nuxtApp.$i18n from the @nuxtjs/i18n plugin instead.
 *
 * SSR starts from the cache cookie. Once authenticated data loads on the
 * client, profile.preferred_locale wins over tenant.ui_locale and refreshes
 * that cookie.
 */
import {
  APP_LOCALE_COOKIE,
} from '~/composables/useAppLocale'
import {
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

    const apply = async (code: AppLocaleCode) => {
      if (i18n.locale.value !== code) {
        await i18n.setLocale(code)
      }
    }

    const initialLocale = resolveAppLocale({ cookieValue: cookie.value })
    if (cookie.value !== initialLocale) cookie.value = initialLocale
    await apply(initialLocale)

    if (import.meta.client) {
      try {
        const authStore = useAuthStore()
        const tenantsStore = useTenantsStore()
        let applyQueue = Promise.resolve()
        watch(
          () => [
            authStore.session?.user?.preferred_locale,
            Boolean(authStore.session?.user),
            tenantsStore.selectedTenant?.id,
            tenantsStore.selectedTenant?.ui_locale,
          ] as const,
          ([profileRaw, profileLoaded, tenantId, tenantRaw]) => {
            const personal = normalizeEnabledAppLocale(profileRaw)
            if (!profileLoaded || (!personal && !tenantId)) return

            const next = resolveAppLocale({
              profileValue: profileRaw,
              tenantValue: tenantRaw,
              cookieValue: cookie.value,
              profileLoaded,
              tenantLoaded: Boolean(tenantId),
            })
            cookie.value = next
            applyQueue = applyQueue
              .then(() => apply(next))
              .catch(() => undefined)
          },
          { immediate: true },
        )
      } catch {
        // ignore store watch if pinia unavailable
      }
    }
  },
})
