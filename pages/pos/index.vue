<script setup lang="ts">
import { ref, computed, provide, onMounted } from 'vue'
import { usePOSStore } from '~/stores/usePOSStore'

definePageMeta({
  layout: 'dashboard'
})

const router = useRouter()
const posStore = usePOSStore()

// State
const searchQuery = ref('')
const selectedCategory = ref('all')
const customerForm = ref({
  phone_number: '',
  name: ''
})
const isLoadingCustomer = ref(false)
const customerError = ref('')

// Load products from API (no await to show both loading indicators)
const { data: productsData, pending: loadingProducts } = useAsyncData(
  'pos-products',
  () => $fetch('/api/menu/products', {
    params: {
      is_available: true,
      limit: 250
    }
  }),
  {
    server: false
  }
)

// Map products to POS format
const products = computed(() => {
  if (!productsData.value?.data) return []

  return productsData.value.data.map((p: any) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    category: p.category?.name || 'Sin categoría',
    image: p.image_url || '🍽️',
    available: p.is_available
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

// Navigate to product customization page
const selectProduct = (product: any) => {
  // Mark that we're navigating within POS
  sessionStorage.setItem('posNavigation', 'true')
  router.push(`/pos/producto/${product.id}`)
}

// Navigate to edit cart item
const editCartItem = (cartIndex: number, productId: string) => {
  // Mark that we're navigating within POS
  sessionStorage.setItem('posNavigation', 'true')
  router.push(`/pos/producto/${productId}?edit=${cartIndex}`)
}

const removeFromCart = (index: number) => {
  posStore.removeFromCart(index)
}

const clearCart = () => {
  posStore.clearCart()
}

const processOrder = () => {
  // Check if customer is identified
  if (!posStore.currentCustomer) {
    alert('Por favor identifica al cliente primero')
    return
  }

  // Mark that we're navigating within POS
  sessionStorage.setItem('posNavigation', 'true')

  // Navigate to checkout page
  router.push('/pos/checkout')
}

const handleCustomerSubmit = async () => {
  if (!customerForm.value.phone_number) return

  try {
    isLoadingCustomer.value = true
    customerError.value = ''

    const response = await $fetch('/api/customers/search-or-create', {
      method: 'POST',
      body: {
        phone_number: customerForm.value.phone_number,
        name: customerForm.value.name || null
      }
    }) as {
      success: boolean
      data: {
        id: string
        phone_number: string
        name: string | null
        email: string | null
      }
      is_new: boolean
    }

    if (response.success) {
      posStore.setCustomer(response.data)
      console.log('✅ Cliente identificado:', response.data)

      // Reset form
      customerForm.value = {
        phone_number: '',
        name: ''
      }
    }
  } catch (error: any) {
    console.error('❌ Error al procesar cliente:', error)
    customerError.value = error.data?.message || error.message || 'Error al procesar el cliente'
  } finally {
    isLoadingCustomer.value = false
  }
}

// Provide cart data to layout
onMounted(() => {
  provide('posCartItemsCount', cartItemsCount)

  // Check if we're returning from a POS sub-page
  const isReturningFromPOSPage = sessionStorage.getItem('posNavigation') === 'true'

  if (isReturningFromPOSPage) {
    // Clear the flag
    sessionStorage.removeItem('posNavigation')
    console.log('↩️ Regresando a POS, manteniendo estado')
  } else {
    // Clear store for new sale (only when entering POS from outside)
    posStore.clearAll()
    console.log('🧹 Store limpiado para nueva venta')

    // Check for pending customer from /ventas page
    const pendingCustomer = sessionStorage.getItem('pendingSaleCustomer')
    if (pendingCustomer) {
      try {
        const customer = JSON.parse(pendingCustomer)
        posStore.setCustomer(customer)
        console.log('✅ Cliente cargado desde session:', customer)

        // Clear from session
        sessionStorage.removeItem('pendingSaleCustomer')
      } catch (error) {
        console.error('Error parsing customer from session:', error)
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

    <!-- Customer Identification Form (shown when no customer) -->
    <div v-else-if="!posStore.currentCustomer" class="flex items-center justify-center min-h-[70vh]">
      <div class="w-full max-w-md">
        <div class="bg-surface rounded-2xl shadow-xl border-2 border-border p-8">
          <!-- Header -->
          <div class="text-center mb-8">
            <div class="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 class="text-2xl font-bold text-text-primary mb-2">Identificar Cliente</h2>
            <p class="text-sm text-text-secondary">
              Ingresa el número de teléfono para comenzar la venta
            </p>
          </div>

          <!-- Form -->
          <form @submit.prevent="handleCustomerSubmit" class="space-y-6">
            <!-- Phone Number -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-2">
                Número de Teléfono *
              </label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary text-xl">
                  📱
                </span>
                <input
                  v-model="customerForm.phone_number"
                  type="tel"
                  placeholder="3001234567"
                  class="w-full pl-12 pr-4 py-4 border-2 border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary text-lg bg-background"
                  required
                  autofocus
                  :disabled="isLoadingCustomer"
                />
              </div>
            </div>

            <!-- Name (Optional) -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-2">
                Nombre (opcional)
              </label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary text-xl">
                  👤
                </span>
                <input
                  v-model="customerForm.name"
                  type="text"
                  placeholder="Juan Pérez"
                  class="w-full pl-12 pr-4 py-4 border-2 border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary bg-background"
                  :disabled="isLoadingCustomer"
                />
              </div>
              <p class="mt-2 text-xs text-text-secondary">
                Si el cliente ya existe, se usará su información guardada
              </p>
            </div>

            <!-- Error Message -->
            <div v-if="customerError" class="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-4">
              <div class="flex items-start gap-3">
                <span class="text-xl">⚠️</span>
                <p class="text-sm text-red-800 dark:text-red-200">
                  {{ customerError }}
                </p>
              </div>
            </div>

            <!-- Loading State -->
            <div v-if="isLoadingCustomer" class="flex justify-center py-4">
              <CommonsTheCustomLoader size="medium" />
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              :disabled="!customerForm.phone_number || isLoadingCustomer"
              class="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              Continuar
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- POS Content (shown when customer is identified) -->
    <div v-else>
      <!-- Customer Header -->
      <div class="bg-surface border-2 border-border rounded-lg mb-4 p-4">
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
              {{ posStore.currentCustomer?.name || 'Sin identificar' }}
            </p>
            <p v-if="posStore.currentCustomer" class="text-xs text-text-secondary">
              📱 {{ posStore.currentCustomer.phone_number }}
            </p>
          </div>
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
          <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 p-1">
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
        @process-order="processOrder"
        @clear-cart="clearCart"
      />
      </div>
    </div>
  </div>
</template>
