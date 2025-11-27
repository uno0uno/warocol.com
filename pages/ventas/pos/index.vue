<script setup lang="ts">
import { ref, computed, provide, onMounted } from 'vue'
import { usePOSStore } from '~/stores/usePOSStore'

definePageMeta({
  layout: 'dashboard'
})

const router = useRouter()
const posStore = usePOSStore()

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
const showCartModal = ref(false)

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

const updateQuantity = (index: number, delta: number) => {
  posStore.updateQuantity(index, delta)
}

const clearCart = () => {
  posStore.clearCart()
  showCartModal.value = false
}

const processOrder = () => {
  // Navigate to checkout page
  router.push('/ventas/pos/checkout')
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

// Provide cart data to layout
onMounted(() => {
  provide('posCartItemsCount', cartItemsCount)
  provide('posOpenCartModal', () => {
    showCartModal.value = true
  })
})
</script>

<template>
  <div>
    <!-- Main POS Container -->
    <div class="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
      <!-- Products Panel (Left) -->
      <div class="flex-1 flex flex-col space-y-4 overflow-hidden gap-2">
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
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-1">
            <button
              v-for="product in filteredProducts"
              :key="product.id"
              class="flex flex-col items-center p-4 border-2 border-border rounded-lg bg-surface hover:bg-surface-secondary hover:border-primary theme-transition hover:shadow-titan hover:scale-105 cursor-pointer active:scale-100"
              @click="selectProduct(product)"
            >
              <div class="text-4xl mb-2">{{ product.image }}</div>
              <p class="text-sm font-medium text-text-primary text-center">{{ product.name }}</p>
              <p class="text-lg font-bold text-primary mt-1">{{ formatCurrency(product.price) }}</p>
            </button>
          </div>
        </div>
      </div>

      <!-- Cart Panel (Right - Desktop Only) -->
      <div class="hidden lg:flex lg:w-96 flex-col border-2 border-border rounded-lg bg-surface overflow-hidden">
        <!-- Cart Header -->
        <div class="p-4 border-b-2 border-border bg-primary">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-bold text-primary-foreground">Orden Actual</h2>
            <span class="px-2.5 py-0.5 text-xs rounded-full font-semibold bg-primary-foreground/10 text-primary-foreground border border-primary-foreground/20">
              {{ posStore.cart.length }} {{ posStore.cart.length === 1 ? 'producto' : 'productos' }}
            </span>
          </div>
        </div>

        <!-- Cart Items -->
        <div class="flex-1 overflow-y-auto p-4 space-y-3">
          <div
            v-if="posStore.cart.length === 0"
            class="text-center py-12"
          >
            <svg class="h-16 w-16 mx-auto text-text-secondary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
            <p class="text-text-secondary">Carrito vacío</p>
            <p class="text-sm text-text-tertiary mt-1">Selecciona productos para agregar</p>
          </div>

          <div
            v-for="(item, index) in posStore.cart"
            :key="index"
            class="flex items-start gap-3 p-3 border border-border rounded-lg bg-surface-secondary theme-transition hover:shadow-titan"
          >
            <!-- Order Number -->
            <div class="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              {{ index + 1 }}
            </div>

            <div
              class="flex-1 min-w-0 cursor-pointer hover:opacity-80 theme-transition"
              @click="editCartItem(index, item.product.id)"
            >
              <p class="text-sm font-medium text-text-primary truncate">{{ item.product.name }}</p>
              <p class="text-xs text-text-secondary">{{ formatCurrency(item.product.price) }} c/u</p>
              <!-- Show modifiers if any -->
              <div v-if="item.modifiers && item.modifiers.length > 0" class="mt-1">
                <p class="text-xs text-text-tertiary">
                  + {{ item.modifiers.map(m => m.name).join(', ') }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2 ml-3">
              <button
                class="w-8 h-8 flex items-center justify-center rounded bg-destructive/10 border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground theme-transition"
                @click="removeFromCart(index)"
              >
                <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Cart Footer -->
        <div class="p-4 border-t-2 border-border space-y-3">
          <!-- Total -->
          <div class="flex items-center justify-between py-2">
            <span class="text-lg font-semibold text-text-primary">Total:</span>
            <span class="text-2xl font-bold text-primary">{{ formatCurrency(cartTotal) }}</span>
          </div>

          <!-- Actions -->
          <div class="space-y-2">
            <UiButton
              variant="default"
              size="lg"
              class="w-full"
              :disabled="posStore.cart.length === 0"
              @click="processOrder"
            >
              <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Procesar Orden
            </UiButton>
            <UiButton
              variant="outline"
              size="default"
              class="w-full"
              :disabled="posStore.cart.length === 0"
              @click="clearCart"
            >
              <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
              Limpiar Carrito
            </UiButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile Cart Modal -->
    <UiBottomSheetModal
      v-model="showCartModal"
      title="Orden Actual"
      max-height="xl"
    >
      <!-- Cart Items -->
      <div class="p-4 space-y-3">
        <div
          v-if="posStore.cart.length === 0"
          class="text-center py-12"
        >
          <svg class="h-16 w-16 mx-auto text-text-secondary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
          </svg>
          <p class="text-text-secondary">Carrito vacío</p>
          <p class="text-sm text-text-tertiary mt-1">Selecciona productos para agregar</p>
        </div>

        <div
          v-for="(item, index) in posStore.cart"
          :key="index"
          class="flex items-start gap-3 p-3 border border-border rounded-lg bg-surface-secondary"
        >
          <!-- Order Number -->
          <div class="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
            {{ index + 1 }}
          </div>

          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-text-primary truncate">{{ item.product.name }}</p>
            <p class="text-xs text-text-secondary">{{ formatCurrency(item.product.price) }} c/u</p>
            <!-- Show modifiers if any -->
            <div v-if="item.modifiers && item.modifiers.length > 0" class="mt-1">
              <p class="text-xs text-text-tertiary">
                + {{ item.modifiers.map(m => m.name).join(', ') }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 ml-3">
            <button
              class="w-8 h-8 flex items-center justify-center rounded bg-destructive/10 border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground theme-transition"
              @click="removeFromCart(index)"
            >
              <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Footer with Total and Actions -->
      <template #footer>
        <div class="p-4 space-y-3">
          <!-- Total -->
          <div class="flex items-center justify-between py-2">
            <span class="text-lg font-semibold text-text-primary">Total:</span>
            <span class="text-2xl font-bold text-primary">{{ formatCurrency(cartTotal) }}</span>
          </div>

          <!-- Actions -->
          <div class="space-y-2">
            <UiButton
              variant="default"
              size="lg"
              class="w-full"
              :disabled="posStore.cart.length === 0"
              @click="processOrder"
            >
              <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Procesar Orden
            </UiButton>
            <UiButton
              variant="outline"
              size="default"
              class="w-full"
              :disabled="posStore.cart.length === 0"
              @click="clearCart"
            >
              <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
              Limpiar Carrito
            </UiButton>
          </div>
        </div>
      </template>
    </UiBottomSheetModal>
  </div>
</template>
