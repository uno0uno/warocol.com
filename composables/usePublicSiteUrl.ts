/**
 * Public site origin from NUXT_PUBLIC_SITE_URL → runtimeConfig.public.siteUrl.
 * Use for storefront / table QR links (never window.location.origin).
 */
export function usePublicSiteUrl() {
  const config = useRuntimeConfig()

  const siteUrl = computed(() =>
    String(config.public.siteUrl || 'https://warocol.com').replace(/\/$/, ''),
  )

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
