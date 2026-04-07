<script setup lang="ts">
import { ref, computed, provide, onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { CachedProduct } from '~/stores/usePOSStore'
import { usePOSStore } from '~/stores/usePOSStore'

definePageMeta({
  layout: 'dashboard'
})

useHead({ title: 'Punto de Venta' })

// Tenant reactivity
const { currentTenant } = useTenantReactive()

const router = useRouter()
const posStore = usePOSStore()
const { tabItems: storeTabItems, tabTotal: storeTabTotal } = storeToRefs(posStore)

// ── Table management redirect ──────────────────────────────────────────────
// Reuses the same cached query key as negocio.vue — no extra network request
const { data: settingsData } = useQuery({
  key: () => ['tenant', 'negocio-profile', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any }>('/api/api/tenant/public-profile'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

watch(
  () => settingsData.value?.data?.tables_enabled,
  (enabled) => {
    if (enabled && !sessionStorage.getItem('mesaContext') && !posStore.activeTableSession) navigateTo('/mesas')
  },
  { immediate: true }
)

// ── Mesa mode ──────────────────────────────────────────────────────────────
const isMesaMode = computed(() => !!posStore.activeTableSession)
const isAddingToTab = ref(false)
const isLoadingTabItems = ref(false)
const tabError = ref<string | null>(null)

// Refresh session running total + tab items from the backend
const refreshTableSession = async () => {
  if (!posStore.activeTableSession) return
  try {
    const session = await $fetch<{ success: boolean; data: any }>(
      `/api/tables/${posStore.activeTableSession.tableId}/current`
    )
    if (session?.data?.session) {
      posStore.setTableSession({
        tableId: posStore.activeTableSession.tableId,
        sessionId: session.data.session.id,
        tableName: posStore.activeTableSession.tableName,
        runningTotal: session.data.session.running_total,
        openedAt: session.data.session.opened_at,
      })
    }
    if (session?.data?.tab_items) {
      posStore.setTabItems(
        session.data.tab_items.map((i: any) => ({
          orderItemId: i.order_item_id,
          productName: i.product_name,
          quantity: i.quantity,
          unitPrice: i.unit_price,
          subtotal: i.subtotal,
        }))
      )
    }
  } catch {
    // Non-critical — banner will just show stale data
  }
}

const tabItemsLoading = ref<Set<string>>(new Set())

const removeTabItem = async (orderItemId: string) => {
  if (!posStore.activeTableSession) return
  tabItemsLoading.value = new Set([...tabItemsLoading.value, orderItemId])
  try {
    await $fetch(`/api/tables/${posStore.activeTableSession.tableId}/tab/items/${orderItemId}`, {
      method: 'DELETE',
    })
    await refreshTableSession()
  } catch (e: any) {
    tabError.value = e?.data?.detail ?? 'Error al eliminar el producto'
  } finally {
    const next = new Set(tabItemsLoading.value)
    next.delete(orderItemId)
    tabItemsLoading.value = next
  }
}

const updateTabItemQuantity = async (orderItemId: string, quantity: number) => {
  if (!posStore.activeTableSession) return
  tabItemsLoading.value = new Set([...tabItemsLoading.value, orderItemId])
  try {
    await $fetch(`/api/tables/${posStore.activeTableSession.tableId}/tab/items/${orderItemId}`, {
      method: 'PATCH',
      body: { quantity },
    })
    await refreshTableSession()
  } catch (e: any) {
    tabError.value = e?.data?.detail ?? 'Error al actualizar la cantidad'
  } finally {
    const next = new Set(tabItemsLoading.value)
    next.delete(orderItemId)
    tabItemsLoading.value = next
  }
}

const incrementTabItem = (orderItemId: string) => {
  const item = storeTabItems.value.find(t => t.orderItemId === orderItemId)
  if (item) updateTabItemQuantity(orderItemId, item.quantity + 1)
}

const decrementTabItem = (orderItemId: string) => {
  const item = storeTabItems.value.find(t => t.orderItemId === orderItemId)
  if (item && item.quantity > 1) updateTabItemQuantity(orderItemId, item.quantity - 1)
}

const addToTab = async () => {
  if (!posStore.activeTableSession || posStore.cart.length === 0) return
  isAddingToTab.value = true
  tabError.value = null
  try {
    const items = posStore.cart.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: Number(item.product.price),
      modifiers: item.modifiers.map((m) => ({ id: m.id, name: m.name, price: m.price })),
      notes: item.notes ?? null,
    }))
    console.log('[pos] addToTab payload', {
      tableId: posStore.activeTableSession.tableId,
      items: items.map(i => ({
        product_id: i.product_id,
        qty: i.quantity,
        unit_price: i.unit_price,
        modifiers: i.modifiers,
        expected_subtotal: i.quantity * (i.unit_price + i.modifiers.reduce((s, m) => s + m.price, 0)),
      })),
    })
    const res = await $fetch(`/api/tables/${posStore.activeTableSession.tableId}/tab/add`, {
      method: 'POST',
      body: { items },
    })
    console.log('[pos] addToTab response', res)
    // Clear cart — items committed to tab
    await posStore.clearCart()
    // Refresh session + tab items
    await refreshTableSession()
    console.log('[pos] after refreshTableSession', { runningTotal: posStore.activeTableSession?.runningTotal, tabItems: storeTabItems.value })
  } catch (e: any) {
    tabError.value = e?.data?.detail ?? 'Error al agregar a la mesa'
  } finally {
    isAddingToTab.value = false
  }
}

const requestBill = () => {
  if (!posStore.activeTableSession) return
  sessionStorage.setItem('posNavigation', 'true')
  router.push('/pos/checkout')
}

const formatDuration = (openedAt: string): string => {
  const diffMs = Date.now() - new Date(openedAt).getTime()
  const totalMins = Math.floor(diffMs / 60_000)
  if (totalMins < 60) return `${totalMins}m`
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

const formatCurrencyPOS = (amount: number): string =>
  `$${Math.round(amount).toLocaleString('es-CO')}`

// State
const searchQuery = ref('')
const selectedCategory = ref('all')

// Load products from API
const { data: productsData, status: productsStatus, asyncStatus: productsAsyncStatus, error: productsError, refetch } = useQuery({
  key: () => ['pos', 'products', currentTenant.value?.id],
  query: () => $fetch('/api/menu/products', {
    params: {
      is_available: true,
      limit: 250,
      include_modifiers: true  // POS context - includes resale products
    }
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const loadingProducts = computed(() => productsStatus.value === 'pending')
const isRefreshing = computed(() => productsAsyncStatus.value === 'loading' && productsData.value != null)
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
registerProgressiveLoading(isRefreshing)

// Clear POS state when tenant changes
watch(() => currentTenant.value?.id, () => { posStore.clearAll() })

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
onMounted(async () => {
  setRefreshHandler(refetch)
  provide('posCartItemsCount', cartItemsCount)

  // Check if we're returning from a POS sub-page
  const isReturningFromPOSPage = sessionStorage.getItem('posNavigation') === 'true'

  // Load mesa context if arriving from mesas page
  const mesaContextRaw = sessionStorage.getItem('mesaContext')

  if (isReturningFromPOSPage) {
    // Returning from product/checkout sub-page — keep cart + table session intact
    sessionStorage.removeItem('posNavigation')
  } else if (mesaContextRaw) {
    // Arriving from /mesas — clear previous sale state, then load table session
    posStore.clearAll()
    sessionStorage.removeItem('mesaContext')
    isLoadingTabItems.value = true
    try {
      const ctx = JSON.parse(mesaContextRaw)
      const session = await $fetch<{ success: boolean; data: any }>(
        `/api/tables/${ctx.tableId}/current`
      )
      if (session?.data?.session) {
        posStore.setTableSession({
          tableId: ctx.tableId,
          sessionId: session.data.session.id,
          tableName: ctx.tableName,
          runningTotal: session.data.session.running_total,
          openedAt: session.data.session.opened_at,
        })
        if (session.data.tab_items) {
          posStore.setTabItems(
            session.data.tab_items.map((i: any) => ({
              orderItemId: i.order_item_id,
              productName: i.product_name,
              quantity: i.quantity,
              unitPrice: i.unit_price,
              subtotal: i.subtotal,
            }))
          )
        }
      }
    } catch {
      // Session may have closed — enter normal POS mode silently
    } finally {
      isLoadingTabItems.value = false
    }
  } else {
    // Fresh entry to POS (not from sub-page, not from mesas)
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

onUnmounted(() => {
  clearRefreshHandler(refetch)
})
</script>

<template>
  <div>
    <!-- Loading State (initial page load) -->
    <div v-if="loadingProducts" class="flex items-center justify-center min-h-[70vh]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="productsError" />

    <!-- POS Content (shown always after loading) -->
    <div v-else>
      <!-- Mesa Banner skeleton while loading tab items -->
      <div v-if="isLoadingTabItems || isAddingToTab" class="bg-surface border border-border rounded-2xl mb-4 p-3.5 shadow-sm animate-pulse">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-surface-secondary flex-shrink-0" />
          <div class="flex-1 flex items-center gap-3">
            <div class="h-2.5 w-20 bg-surface-secondary rounded" />
            <div class="h-2.5 w-16 bg-surface-secondary rounded" />
            <div class="h-2.5 w-32 bg-surface-secondary rounded" />
          </div>
          <div class="h-7 w-16 bg-surface-secondary rounded-lg flex-shrink-0" />
        </div>
      </div>

      <!-- Mesa Banner (when arriving from a table session) -->
      <div v-else-if="posStore.activeTableSession" class="bg-surface border border-border rounded-2xl mb-4 p-3.5 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="bg-status-success-bg p-2.5 rounded-xl flex-shrink-0">
            <svg class="w-4 h-4 text-status-success-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 10h18M3 14h18M10 10V6m4 4V6m-9 8v4m14-4v4M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
            </svg>
          </div>
          <div class="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
            <span class="text-[10px] font-bold text-status-success-text uppercase tracking-widest flex-shrink-0">Mesa Activa</span>
            <span class="w-px h-3 bg-border flex-shrink-0" aria-hidden="true" />
            <span class="text-sm font-bold text-text-primary flex-shrink-0">{{ posStore.activeTableSession.tableName }}</span>
            <span class="w-px h-3 bg-border flex-shrink-0" aria-hidden="true" />
            <span class="text-xs text-text-secondary tabular-nums truncate">{{ formatCurrencyPOS(posStore.activeTableSession.runningTotal) }} acumulado · {{ formatDuration(posStore.activeTableSession.openedAt) }}</span>
          </div>
          <!-- Change table button -->
          <NuxtLink
            to="/mesas"
            class="flex-shrink-0 text-[10px] font-bold text-text-secondary uppercase tracking-wider px-2.5 py-1.5 rounded-lg border border-border hover:bg-surface-secondary hover:text-text-primary transition-colors"
          >
            Cambiar
          </NuxtLink>
        </div>
        <!-- Tab error -->
        <p v-if="tabError" class="mt-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-1.5">
          {{ tabError }}
        </p>
      </div>

      <!-- Customer Header (when customer is identified and no mesa mode) -->
      <div v-else-if="posStore.currentCustomer" class="bg-crocus-600/5 border border-crocus-500/25 rounded-xl mb-4 p-4">
        <div class="flex items-center gap-3">
          <div class="bg-crocus-600/10 p-3 rounded-xl border border-crocus-500/20 flex-shrink-0">
            <svg class="w-5 h-5 text-crocus-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p class="text-[10px] font-bold text-crocus-600 uppercase tracking-widest">
              Cliente Actual
            </p>
            <p class="text-base font-bold text-text-primary leading-tight">
              {{ posStore.currentCustomer.name || 'Sin nombre' }}
            </p>
            <p class="text-xs text-text-secondary mt-0.5">
              📱 {{ posStore.currentCustomer.phone_number }}
            </p>
          </div>
        </div>
      </div>


      <!-- Main POS Container -->
    <div class="flex flex-col lg:flex-row gap-4 md:gap-6 lg:max-h-[calc(100vh-10rem)]">
      <!-- Products Panel (Left) -->
      <div class="flex-1 flex flex-col space-y-4 lg:overflow-hidden">
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
        <div class="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button
            v-for="cat in categories"
            :key="cat"
            class="px-3.5 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap theme-transition"
            :class="selectedCategory === cat
              ? 'bg-text-primary text-white shadow-md'
              : 'bg-surface border border-border text-text-secondary hover:border-border hover:text-text-primary hover:bg-surface-secondary'"
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
          <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 gap-2 md:gap-4 p-1 pb-4">
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
        :mesa-mode="isMesaMode"
        :is-adding-to-tab="isAddingToTab"
        :is-loading-tab-items="isLoadingTabItems"
        :tab-items="storeTabItems"
        :tab-total="storeTabTotal"
        :tab-items-loading="tabItemsLoading"
        @edit-item="editCartItem"
        @remove-item="removeFromCart"
        @increment-item="incrementCartItem"
        @decrement-item="decrementCartItem"
        @duplicate-item="duplicateCartItem"
        @process-order="processOrder"
        @clear-cart="clearCart"
        @add-to-tab="addToTab"
        @request-bill="requestBill"
        @remove-tab-item="removeTabItem"
        @increment-tab-item="incrementTabItem"
        @decrement-tab-item="decrementTabItem"
      />
      </div>
    </div>
  </div>
</template>
