/**
 * Public site origin from NUXT_PUBLIC_SITE_URL → runtimeConfig.public.siteUrl.
 * Use for storefront / table QR / guest portal / KDS links (never window.location.origin).
 */
export function publicSiteOriginFromConfig (siteUrl: string | null | undefined): string {
  return String(siteUrl || 'https://warocol.com').replace(/\/+$/, '')
}

export function usePublicSiteUrl() {
  const config = useRuntimeConfig()

  const siteUrl = computed(() => publicSiteOriginFromConfig(config.public.siteUrl as string | undefined))

  return { siteUrl }
}

/**
 * Storefront URL slug (e.g. waro-colombia), not the internal tenant slug (warocolombia).
 * Same precedence as pages/negocio.vue publicUrl.
 */
export function usePublicStorefrontSlug() {
  const { businessProfile, currentTenant } = useTenantReactive()

  const publicSlug = computed(
    () => businessProfile.value?.slug || currentTenant.value?.slug || null,
  )

  return { publicSlug }
}
