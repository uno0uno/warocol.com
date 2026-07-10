/**
 * Apply resolved UI locale after pinia/i18n are ready.
 * Cookie override wins; otherwise tenant locale (B1) when present; else es.
 */
export default defineNuxtPlugin({
  name: 'waro-i18n-locale',
  // After @nuxtjs/i18n so useI18n()/setLocale are available.
  enforce: 'post',
  async setup() {
    const { syncFromSources, tenantLocale, applyLocale } = useAppLocale()
    const cookie = useCookie<string | null>('waro_locale')

    await syncFromSources()

    // When B1 locale appears and user has no explicit cookie, follow tenant.
    watch(
      tenantLocale,
      async (next) => {
        if (!next) return
        if (cookie.value === 'es' || cookie.value === 'en') return
        await applyLocale(next, { persist: false })
      },
    )
  },
})
