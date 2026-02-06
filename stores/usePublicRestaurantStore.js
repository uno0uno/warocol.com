/**
 * Public Restaurant Store
 * Handles public restaurant profile and menu data
 * No authentication required
 */
export const usePublicRestaurantStore = defineStore('public-restaurant', () => {
  // State
  const restaurant = ref(null)
  const menu = ref(null)
  const selectedProduct = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  // Computed
  const isRestaurantOpen = computed(() => {
    return restaurant.value?.is_currently_open || false
  })

  const categories = computed(() => {
    if (!menu.value?.categories) return []
    return menu.value.categories
  })

  const products = computed(() => {
    if (!menu.value?.products) return []
    return menu.value.products
  })

  const restaurantName = computed(() => {
    return restaurant.value?.display_name || menu.value?.restaurant_name || ''
  })

  const businessHours = computed(() => {
    return restaurant.value?.business_hours || {}
  })

  const socialMedia = computed(() => {
    return restaurant.value?.social_media || {}
  })

  // Actions
  async function fetchRestaurantProfile(slug) {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch(`/api/public/restaurant/${slug}`)

      if (response.success) {
        restaurant.value = response.data
        return response.data
      } else {
        throw new Error('Restaurant not found')
      }
    } catch (err) {
      error.value = err.message || 'Error loading restaurant profile'
      console.error('Error fetching restaurant profile:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function fetchMenu(slug, categoryId = null) {
    isLoading.value = true
    error.value = null

    try {
      const params = categoryId ? { category_id: categoryId } : {}
      const response = await $fetch(`/api/public/restaurant/${slug}/menu`, { params })

      if (response.success) {
        menu.value = response.data
        return response.data
      } else {
        throw new Error('Menu not found')
      }
    } catch (err) {
      error.value = err.message || 'Error loading menu'
      console.error('Error fetching menu:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function fetchProductDetail(slug, productId) {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch(`/api/public/restaurant/${slug}/product/${productId}`)

      if (response.success) {
        selectedProduct.value = response.data
        return response.data
      } else {
        throw new Error('Product not found')
      }
    } catch (err) {
      error.value = err.message || 'Error loading product'
      console.error('Error fetching product detail:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  function filterProductsByCategory(categoryId) {
    if (!menu.value?.products) return []

    if (!categoryId || categoryId === 'all') {
      return menu.value.products
    }

    return menu.value.products.filter(p => p.category_id === categoryId)
  }

  function clearSelectedProduct() {
    selectedProduct.value = null
  }

  function clearAll() {
    restaurant.value = null
    menu.value = null
    selectedProduct.value = null
    error.value = null
    isLoading.value = false
  }

  return {
    // State
    restaurant: readonly(restaurant),
    menu: readonly(menu),
    selectedProduct: readonly(selectedProduct),
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Computed
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
    clearAll
  }
})
