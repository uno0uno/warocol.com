/**
 * Public Restaurant Store
 * Handles public restaurant profile and menu data.
 * No authentication required.
 *
 * Migrated to Pinia Colada useMutation — eliminates manual isLoading + error refs.
 * Note: this store currently has no active callers — pages/[tenant]/index.vue uses
 * useAsyncData directly. This migration is infrastructure for Phase 4 (#279).
 */
export const usePublicRestaurantStore = defineStore('public-restaurant', () => {
  // ── Local state not derived from API ─────────────────────────────────
  const selectedProduct = ref(null)

  // ── Mutations ─────────────────────────────────────────────────────────
  const profileMutation = useMutation({
    mutation: (slug) => $fetch(`/api/public/restaurant/${slug}`),
  })

  const menuMutation = useMutation({
    mutation: ({ slug, categoryId = null }) => {
      const params = categoryId ? { category_id: categoryId } : {}
      return $fetch(`/api/public/restaurant/${slug}/menu`, { params })
    },
  })

  const productMutation = useMutation({
    mutation: ({ slug, productId }) =>
      $fetch(`/api/public/restaurant/${slug}/product/${productId}`),
    onSuccess(response) {
      selectedProduct.value = response.success ? response.data : null
    },
  })

  // ── Computed state (preserving existing API shape) ────────────────────
  const restaurant = computed(() =>
    profileMutation.data.value?.success ? profileMutation.data.value.data : null
  )

  const menu = computed(() =>
    menuMutation.data.value?.success ? menuMutation.data.value.data : null
  )

  const isLoading = computed(() =>
    profileMutation.isLoading.value ||
    menuMutation.isLoading.value ||
    productMutation.isLoading.value
  )

  const error = computed(() => {
    const e = profileMutation.error.value || menuMutation.error.value || productMutation.error.value
    return e ? (e.message || 'Error loading data') : null
  })

  // ── Derived computeds (unchanged from original) ───────────────────────
  const isRestaurantOpen = computed(() => restaurant.value?.is_currently_open || false)

  const categories = computed(() => menu.value?.categories ?? [])

  const products = computed(() => menu.value?.products ?? [])

  const restaurantName = computed(() =>
    restaurant.value?.display_name || menu.value?.restaurant_name || ''
  )

  const businessHours = computed(() => restaurant.value?.business_hours || {})

  const socialMedia = computed(() => restaurant.value?.social_media || {})

  // ── Action wrappers (preserve existing call signatures) ───────────────
  const fetchRestaurantProfile = (slug) => profileMutation.mutateAsync(slug)

  const fetchMenu = (slug, categoryId = null) =>
    menuMutation.mutateAsync({ slug, categoryId })

  const fetchProductDetail = (slug, productId) =>
    productMutation.mutateAsync({ slug, productId })

  const filterProductsByCategory = (categoryId) => {
    if (!menu.value?.products) return []
    if (!categoryId || categoryId === 'all') return menu.value.products
    return menu.value.products.filter((p) => p.category_id === categoryId)
  }

  const clearSelectedProduct = () => {
    selectedProduct.value = null
  }

  const clearAll = () => {
    profileMutation.reset()
    menuMutation.reset()
    productMutation.reset()
    selectedProduct.value = null
  }

  return {
    // Computed state
    restaurant,
    menu,
    selectedProduct: readonly(selectedProduct),
    isLoading,
    error,
    // Derived computeds
    isRestaurantOpen,
    categories,
    products,
    restaurantName,
    businessHours,
    socialMedia,
    // Actions
    fetchRestaurantProfile,
    fetchMenu,
    fetchProductDetail,
    filterProductsByCategory,
    clearSelectedProduct,
    clearAll,
  }
})
