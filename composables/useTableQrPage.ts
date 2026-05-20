import { computed, onMounted, ref, watch } from 'vue'
import { useCityCatalog } from '~/composables/useCityCatalog'

export interface TableQrResolveData {
  tenant_slug: string
  display_name: string
  table_name: string
  is_currently_open: boolean
}

interface TableQrMenuPayload {
  categories: any[]
  products: any[]
  restaurant_name: string
  table_name: string
  is_currently_open: boolean
}

/**
 * Client-only table QR session (resolve + menu).
 * Pair with definePageMeta({ ssr: false }) and routeRules for mesa paths.
 */
export function useTableQrPage() {
  const route = useRoute()
  const tenantSlug = computed(() => String(route.params.tenant ?? ''))
  const token = computed(() => String(route.params.token ?? ''))
  const { isCitySlug } = useCityCatalog()
  const isCity = computed(() => isCitySlug(tenantSlug.value))

  const isClientReady = ref(false)
  onMounted(() => {
    isClientReady.value = true
  })

  const { data: resolveData, status: resolveStatus, error: resolveError } = useQuery({
    key: () => ['table-qr', token.value, 'resolve'],
    query: () =>
      $fetch<{ success: boolean; data: TableQrResolveData }>(`/api/public/table-qr/${token.value}`),
    enabled: () => isClientReady.value && !!token.value && !isCity.value,
    staleTime: 30_000,
  })

  const resolve = computed(() => resolveData.value?.data ?? null)

  // Canonical storefront slug from API (tenant_public_profiles.slug).
  // Old QRs may use internal tenant.slug in the URL — normalize once resolved.
  watch(
    () => [resolve.value?.tenant_slug, tenantSlug.value, token.value] as const,
    ([canonical, pathSlug, tok]) => {
      if (!process.client || !canonical || !tok || canonical === pathSlug) return
      navigateTo(`/${canonical}/mesa/${tok}`, { replace: true })
    },
  )

  const { data: menuData, status: menuStatus, error: menuError } = useQuery({
    key: () => ['table-qr', token.value, 'menu'],
    query: () =>
      $fetch<{ success: boolean; data: TableQrMenuPayload }>(
        `/api/public/table-qr/${token.value}/menu`,
      ),
    enabled: () => isClientReady.value && !!token.value && !!resolve.value && !isCity.value,
    staleTime: 30_000,
  })

  const categories = computed(() => menuData.value?.data?.categories ?? [])
  const products = computed(() => menuData.value?.data?.products ?? [])
  const isOpen = computed(
    () => resolve.value?.is_currently_open ?? menuData.value?.data?.is_currently_open ?? false,
  )
  const orderingEnabled = computed(() => !!resolve.value)

  /** Full-screen matrix loader — first client fetch only */
  const isInitialLoading = computed(() => {
    if (isCity.value) return false
    if (!isClientReady.value) return true
    return resolveStatus.value === 'pending' && !resolve.value
  })

  /** Shell visible; menu still fetching (optimistic after resolve) */
  const isMenuLoading = computed(
    () => menuStatus.value === 'pending' && menuData.value === undefined,
  )

  const loadError = computed(() => !!resolveError.value || !!menuError.value)

  return {
    tenantSlug,
    token,
    isCity,
    resolve,
    categories,
    products,
    isOpen,
    orderingEnabled,
    isInitialLoading,
    isMenuLoading,
    loadError,
  }
}
