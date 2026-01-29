<script setup lang="ts">
import { ref, computed, provide, onMounted, watch } from 'vue'
import type { CachedProduct } from '~/stores/usePOSStore'
import { usePOSStore } from '~/stores/usePOSStore'

definePageMeta({
  layout: 'dashboard'
})

useHead({ title: 'Punto de Venta' })

// Tenant reactivity
const { onTenantChange, currentTenant } = useTenantReactive()

const router = useRouter()
const posStore = usePOSStore()

// State
const searchQuery = ref('')
const selectedCategory = ref('all')

// Load products from API (no await to show both loading indicators)
const { data: productsData, pending: loadingProducts, refresh: refreshProducts } = useAsyncData(
  `pos-products-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/menu/products', {
    params: {
      is_available: true,
      limit: 250,
      include_modifiers: true  // POS context - includes resale products
    }
  }),
  {
    server: false,
    watch: [currentTenant]
  }
)

// Refresh on tenant change
onTenantChange(async () => {
  await refreshProducts()
  // Clear POS state when tenant changes
  posStore.clearAll()
})

// Cachear productos con modificadores cuando cargan
watch(() => productsData.value, (data) => {
  if (data?.data) {
    const productsToCache: CachedProduct[] = data.data.map((p: any) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price) || 0,
      image: p.image_url || '🍽️',
      category: p.category_name || p.category?.name || 'Sin categoría',
      is_available: p.is_available,
      is_resale: p.is_resale || false,
      modifier_groups: p.modifier_groups || []
    }))
    posStore.setProducts(productsToCache)
  }
}, { immediate: true })

// Map products to POS format
const products = computed(() => {
  if (!productsData.value?.data) return []

  return productsData.value.data.map((p: any) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    category: p.category_name || p.category?.name || 'Sin categoría',
    image: p.image_url || '🍽️',
    available: p.is_available,
    is_resale: p.is_resale || false
  }))
})

const categories = computed(() => {
  const cats = new Set(products.value.map(p => p.category))
  return ['all', ...Array.from(cats)]
})

const filteredProducts = computed(() => {
  return products.value.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesCategory = selectedCategory.value === 'all' || product.category === selectedCategory.value
    return matchesSearch && matchesCategory
  })
})

// Use store for cart data
const cartItemsCount = computed(() => posStore.cartItemsCount)
const cartTotal = computed(() => posStore.cartTotal)

// Navigate to product customization page or add directly to cart
const selectProduct = async (product: any) => {
  // Resale products don't need modifiers - add directly to cart
  if (product.is_resale) {
    await posStore.addToCart({
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        category: product.category
      },
      quantity: 1,
      modifiers: [],
      is_resale: true
    })
    return
  }

  // Regular products - navigate to customization page
  sessionStorage.setItem('posNavigation', 'true')
  router.push(`/pos/producto/${product.id}`)
}

// Navigate to edit cart item
const editCartItem = (cartIndex: number, productId: string) => {
  // Mark that we're navigating within POS
  sessionStorage.setItem('posNavigation', 'true')
  router.push(`/pos/producto/${productId}?edit=${cartIndex}`)
}

const removeFromCart = async (index: number) => {
  await posStore.removeFromCart(index)
}

const incrementCartItem = async (index: number) => {
  await posStore.updateQuantity(index, 1)
}

const decrementCartItem = async (index: number) => {
  await posStore.updateQuantity(index, -1)
}

const duplicateCartItem = async (index: number) => {
  await posStore.duplicateCartItem(index)
}

const clearCart = async () => {
  await posStore.clearCart()
}

const processOrder = async () => {
  // Esperar a que todas las operaciones pendientes terminen (duplicar, agregar, etc.)
  await posStore.waitForPendingOperations()

  // Mark that we're navigating within POS
  sessionStorage.setItem('posNavigation', 'true')

  // Navigate to checkout page (cliente se pide al finalizar)
  router.push('/pos/checkout')
}

// Provide cart data to layout
onMounted(() => {
  provide('posCartItemsCount', cartItemsCount)

  // Check if we're returning from a POS sub-page
  const isReturningFromPOSPage = sessionStorage.getItem('posNavigation') === 'true'

  if (isReturningFromPOSPage) {
    // Clear the flag
    sessionStorage.removeItem('posNavigation')
  } else {
    // Clear store for new sale (only when entering POS from outside)
    posStore.clearAll()

    // Check for pending customer from /ventas page
    const pendingCustomer = sessionStorage.getItem('pendingSaleCustomer')
    if (pendingCustomer) {
      try {
        const customer = JSON.parse(pendingCustomer)
        posStore.setCustomer(customer)

        // Clear from session
        sessionStorage.removeItem('pendingSaleCustomer')
      } catch (error) {
        // Error parsing customer
      }
    }
  }
})
</script>

<template>
  <div>
    <!-- Loading State (initial page load) -->
    <div v-if="loadingProducts" class="flex items-center justify-center min-h-[70vh]">
      <div class="text-center">
        <CommonsTheCustomLoader size="large" />
        <p class="text-text-secondary font-medium mt-6">Cargando POS...</p>
      </div>
    </div>

    <!-- POS Content (shown always after loading) -->
    <div v-else>
      <!-- Customer Header (when customer is identified) -->
      <div v-if="posStore.currentCustomer" class="bg-surface border-2 border-border rounded-lg mb-4 p-4">
        <div class="flex items-center gap-3">
          <div class="bg-background p-3 rounded-lg border border-border">
            <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Cliente Actual
            </p>
            <p class="text-lg font-semibold text-text-primary">
              {{ posStore.currentCustomer.name || 'Sin nombre' }}
            </p>
            <p class="text-xs text-text-secondary">
              📱 {{ posStore.currentCustomer.phone_number }}
            </p>
          </div>
        </div>
      </div>

      <!-- Sin cliente - Banner informativo -->
      <div v-else class="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700 rounded-lg mb-4 p-3">
        <div class="flex items-center gap-2">
          <span class="text-amber-600 dark:text-amber-400">👤</span>
          <p class="text-sm text-amber-800 dark:text-amber-200">
            <span class="font-medium">Sin cliente identificado</span> — Se pedirá al procesar la orden
          </p>
        </div>
      </div>

      <!-- Main POS Container -->
    <div class="flex flex-col lg:flex-row gap-4 md:gap-6 lg:max-h-[calc(100vh-10rem)]">
      <!-- Products Panel (Left) -->
      <div class="flex-1 flex flex-col space-y-4 lg:overflow-hidden gap-2">
        <!-- Search and Filters -->
        <div class="flex flex-col sm:flex-row gap-3">
          <div class="flex-1">
            <UiSearchBar
              v-model="searchQuery"
              placeholder="Buscar productos..."
            />
          </div>
        </div>

        <!-- Category Tabs -->
        <div class="flex gap-2 overflow-x-auto">
          <button
            v-for="cat in categories"
            :key="cat"
            class="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap theme-transition"
            :class="selectedCategory === cat
              ? 'bg-primary text-primary-foreground shadow-crocus'
              : 'bg-surface-secondary text-text-secondary hover:bg-surface-tertiary hover:shadow-titan'"
            @click="selectedCategory = cat"
          >
            {{ cat === 'all' ? 'Todos' : cat }}
          </button>
        </div>

        <!-- Products Grid -->
        <div class="flex-1 overflow-y-auto">
          <!-- Empty State -->
          <div v-if="filteredProducts.length === 0" class="flex flex-col items-center justify-center h-64 text-text-secondary">
            <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p class="text-lg font-medium">No hay productos disponibles</p>
            <p class="text-sm mt-1">Agrega productos desde el menú</p>
          </div>

          <!-- Products Grid -->
          <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 p-1">
            <PosProductCard
              v-for="product in filteredProducts"
              :key="product.id"
              :product="product"
              @select="selectProduct"
            />
          </div>
        </div>
      </div>

      <!-- Cart Panel (Right on Desktop, Below on Mobile/Tablet) -->
      <PosCartPanel
        :items="posStore.cart"
        :total="cartTotal"
        @edit-item="editCartItem"
        @remove-item="removeFromCart"
        @increment-item="incrementCartItem"
        @decrement-item="decrementCartItem"
        @duplicate-item="duplicateCartItem"
        @process-order="processOrder"
        @clear-cart="clearCart"
      />
      </div>
    </div>
  </div>
</template>
