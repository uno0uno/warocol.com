<script setup lang="ts">
import { ref, computed, provide, onMounted } from 'vue'
import { usePOSStore } from '~/stores/usePOSStore'

definePageMeta({
  layout: 'dashboard'
})

const router = useRouter()
const posStore = usePOSStore()

// State
const showCustomerModal = ref(false)

// Mock products for POS
const products = ref([
  { id: '1', name: 'Hamburguesa Clásica', price: 15000, category: 'Hamburguesas', image: '🍔', available: true },
  { id: '2', name: 'Pizza Margherita', price: 25000, category: 'Pizzas', image: '🍕', available: true },
  { id: '3', name: 'Limonada Natural', price: 5000, category: 'Bebidas', image: '🍹', available: true },
  { id: '4', name: 'Papas Fritas', price: 7000, category: 'Acompañamientos', image: '🍟', available: true },
  { id: '5', name: 'Combo Hamburguesa', price: 18000, category: 'Combos', image: '🎁', available: true },
  { id: '6', name: 'Ensalada César', price: 12000, category: 'Ensaladas', image: '🥗', available: true }
])

const searchQuery = ref('')
const selectedCategory = ref('all')

const categories = computed(() => {
  const cats = new Set(products.value.map(p => p.category))
  return ['all', ...Array.from(cats)]
})

const filteredProducts = computed(() => {
  return products.value.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesCategory = selectedCategory.value === 'all' || product.category === selectedCategory.value
    return matchesSearch && matchesCategory && product.available
  })
})

// Use store for cart data
const cartItemsCount = computed(() => posStore.cartItemsCount)
const cartTotal = computed(() => posStore.cartTotal)

// Navigate to product customization page
const selectProduct = (product: any) => {
  router.push(`/ventas/pos/producto/${product.id}`)
}

// Navigate to edit cart item
const editCartItem = (cartIndex: number, productId: string) => {
  router.push(`/ventas/pos/producto/${productId}?edit=${cartIndex}`)
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
    showCustomerModal.value = true
    return
  }

  // Navigate to checkout page
  router.push('/ventas/pos/checkout')
}

const startNewSale = () => {
  showCustomerModal.value = true
}

const handleCustomerIdentified = (customer: any) => {
  posStore.setCustomer(customer)
  console.log('Cliente identificado:', customer)
}

// Provide cart data to layout
onMounted(() => {
  provide('posCartItemsCount', cartItemsCount)
})
</script>

<template>
  <div>
    <!-- Customer Identification Modal -->
    <PosCustomerIdentificationModal
      v-model="showCustomerModal"
      @customer-identified="handleCustomerIdentified"
    />

    <!-- Customer Header -->
    <div class="bg-surface border-2 border-border rounded-lg mb-4 p-4">
      <div class="flex items-center justify-between">
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
        <button
          @click="startNewSale"
          class="btn-primary px-4 py-2 rounded-lg font-medium shadow-crocus flex items-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {{ posStore.currentCustomer ? 'Cambiar Cliente' : 'Nueva Venta' }}
        </button>
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
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 p-1">
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
</template>
