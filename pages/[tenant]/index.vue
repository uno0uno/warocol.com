<script setup lang="ts">
import RestaurantHeader from '~/components/public/RestaurantHeader.vue'
import PublicMenu from '~/components/public/PublicMenu.vue'
import CartBottomBar from '~/components/online/CartBottomBar.vue'
import CartDrawer from '~/components/online/CartDrawer.vue'
import ProductDetailDrawer from '~/components/online/ProductDetailDrawer.vue'
import { useOnlineCartStore } from '~/stores/online_cart'
import { useToast } from '~/composables/useToast'

definePageMeta({
  layout: 'public-restaurant'
})

const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const tenantSlug = route.params.tenant

// Initialize cart store
const cartStore = useOnlineCartStore()
const toast = useToast()

// Session init must happen before useFetch so sessionId is set at call time
if (process.client) {
  const storedSessionId = localStorage.getItem('waro_session_id')
  cartStore.initSession(storedSessionId)
}

// Cart drawer state
const isCartOpen = ref(false)

// Cross-tenant switch guard
const switchDialogVisible = ref(false)
const pendingTenant = ref<{ id: string; name: string } | null>(null)

// Product detail drawer state
const isProductDrawerOpen = ref(false)
const selectedProduct = ref<Record<string, any> | null>(null)

// SSR data fetching — await ensures data is ready before rendering on server
const { data: profileData, error: profileError, pending: pendingProfile, refresh: refreshProfile } = await useAsyncData(
  `restaurant-${tenantSlug}`,
  () => $fetch(`/api/public/restaurant/${tenantSlug}`),
  { server: true }
)

const { data: menuData, error: menuError, pending: pendingMenu, refresh: refreshMenu } = await useAsyncData(
  `menu-${tenantSlug}`,
  () => $fetch(`/api/public/restaurant/${tenantSlug}/menu`),
  { server: true }
)

const restaurant = computed(() => profileData.value?.data || null)

// Declared at setup scope so $fetch Nuxt auto-import is in context.
const recoverCartSession = async (tenantId: string) => {
  try {
    const cart = await $fetch<{ data: any }>(`/api/online/cart/session/${cartStore.sessionId}`, {
      query: { tenant_id: tenantId }
    })
    if (cart?.data) cartStore.hydrateFromBackend(cart.data)
  } catch {
    // No active cart for this session — expected on first visit
  }
}

// Set tenant UUID from profile data and recover session once tenant is known.
// The recovery promise is registered in the store so addItem() can await it
// and avoid racing with hydrateFromBackend() on the first click.
watch(restaurant, (val: any) => {
  if (!val?.tenant_id) return

  // Cross-tenant guard: if cart has items from a different restaurant, ask before switching
  if (
    process.client &&
    cartStore.tenantId &&
    cartStore.tenantId !== val.tenant_id &&
    !cartStore.isEmpty
  ) {
    pendingTenant.value = { id: val.tenant_id, name: val.display_name }
    switchDialogVisible.value = true
    return // defer setTenant + recoverCartSession until user confirms
  }

  cartStore.setTenant(val.tenant_id, val.display_name)
  if (!process.client || !cartStore.sessionId) return
  cartStore.setRecoveryPromise(recoverCartSession(val.tenant_id))
}, { immediate: true })

const categories = computed(() => menuData.value?.data?.categories || [])
const products = computed(() => menuData.value?.data?.products || [])
const isLoading = computed(() => pendingProfile.value || pendingMenu.value)
const error = computed(() => profileError.value || menuError.value)

// Format business hours for schema.org
function formatOpeningHours(businessHours) {
  if (!businessHours) return []

  const dayMap = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  }

  return Object.entries(businessHours)
    .filter(([_, hours]) => !hours.closed)
    .map(([day, hours]) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: dayMap[day.toLowerCase()],
      opens: hours.open,
      closes: hours.close
    }))
}

// SEO — reactive with arrow functions (same pattern as blog)
const siteUrl = config.public.siteUrl || 'https://warocol.com'

useHead({
  title: () => restaurant.value?.seo_title || (restaurant.value ? `${restaurant.value.display_name} - Menú` : 'Cargando...'),
  meta: [
    {
      name: 'description',
      content: () => restaurant.value?.seo_description || restaurant.value?.description || ''
    },
    // Open Graph
    { property: 'og:type', content: 'restaurant' },
    { property: 'og:title', content: () => restaurant.value?.seo_title || restaurant.value?.display_name || '' },
    { property: 'og:description', content: () => restaurant.value?.seo_description || restaurant.value?.description || '' },
    { property: 'og:image', content: () => restaurant.value?.banner_url || '' },
    { property: 'og:url', content: () => `${siteUrl}/${tenantSlug}` },
    // Twitter
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: () => restaurant.value?.seo_title || restaurant.value?.display_name || '' },
    { name: 'twitter:description', content: () => restaurant.value?.seo_description || restaurant.value?.description || '' },
    { name: 'twitter:image', content: () => restaurant.value?.banner_url || '' },
  ],
  link: [
    { rel: 'canonical', href: () => `${siteUrl}/${tenantSlug}` }
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: () => restaurant.value ? JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Restaurant',
        name: restaurant.value.display_name,
        description: restaurant.value.description,
        image: restaurant.value.banner_url || restaurant.value.logo_url,
        telephone: restaurant.value.phone_number,
        address: restaurant.value.address ? {
          '@type': 'PostalAddress',
          streetAddress: restaurant.value.address,
          addressLocality: restaurant.value.city,
          addressCountry: 'CO'
        } : undefined,
        openingHoursSpecification: formatOpeningHours(restaurant.value.business_hours),
        priceRange: '$$',
        servesCuisine: 'Colombian',
        url: `${siteUrl}/${tenantSlug}`
      }) : '{}'
    }
  ]
})


// Handle product click - Always open drawer for availability check + modifier selection
const handleProductClick = (product: Record<string, any>) => {
  selectedProduct.value = product
  isProductDrawerOpen.value = true
}

// Handle + button on a customizable cart item — open ingredient selector for 1 new unit
const handleOpenProductFromCart = (product: { id: string; name: string; price: number; has_modifiers: boolean }) => {
  selectedProduct.value = product
  isProductDrawerOpen.value = true
}

// Handle checkout - refresh profile + menu, purge unavailable items, block if closed or cart empty
const handleCheckout = async () => {
  await Promise.all([refreshProfile(), refreshMenu()])
  if (!(restaurant.value?.is_currently_open ?? true)) return

  // Purge items that are no longer available online (same logic as handleCartOpen)
  const onlineIds = new Set(products.value.map((p: any) => p.id))
  const offlineItems = cartStore.items.filter((item: { product_id: string }) => !onlineIds.has(item.product_id))
  if (offlineItems.length > 0) {
    for (const item of offlineItems) {
      await cartStore.removeItem(item.id)
    }
    const names = offlineItems.map((i: { product_name: string }) => i.product_name).join(', ')
    toast.warning(
      `Producto(s) eliminado(s) del carrito: ${names}. Ya no están disponibles para domicilios.`,
      { duration: 6000 }
    )
    if (cartStore.isEmpty) return
  }

  router.push(`/${tenantSlug}/checkout`)
}

// Handle cart open - refresh profile + purge products no longer available online
const handleCartOpen = async () => {
  isCartOpen.value = true
  refreshProfile()

  // Products list only contains is_available_online=true items (filtered by backend)
  // Any cart item missing from the current list has been taken offline since it was added
  const onlineIds = new Set(products.value.map((p: any) => p.id))
  const offlineItems = cartStore.items.filter((item: { product_id: string }) => !onlineIds.has(item.product_id))

  if (offlineItems.length > 0) {
    for (const item of offlineItems) {
      await cartStore.removeItem(item.id)
    }
    const names = offlineItems.map((i: { product_name: string }) => i.product_name).join(', ')
    toast.warning(
      `Producto(s) eliminado(s) del carrito: ${names}. Ya no están disponibles para domicilios.`,
      { duration: 6000 }
    )
  }
}

// Cross-tenant switch: confirm clears old cart and activates the new restaurant
const confirmSwitch = async () => {
  if (!pendingTenant.value) return
  try {
    await cartStore.clearCart()
  } catch {
    // clearCart failure is non-critical; proceed anyway
  }
  const { id, name } = pendingTenant.value
  cartStore.setTenant(id, name)
  if (cartStore.sessionId) cartStore.setRecoveryPromise(recoverCartSession(id))
  pendingTenant.value = null
  switchDialogVisible.value = false
}

// Cross-tenant switch: cancel keeps the existing cart untouched
const cancelSwitch = () => {
  pendingTenant.value = null
  switchDialogVisible.value = false
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Loading State -->
    <div v-if="isLoading && !restaurant" class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <CommonsTheCustomLoader size="large" />
        <p class="text-gray-600 mt-4">Cargando restaurante...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="min-h-screen flex items-center justify-center px-4">
      <div class="text-center max-w-md">
        <div class="text-6xl mb-6">😕</div>
        <h1 class="text-3xl font-bold text-gray-900 mb-4">Restaurante no encontrado</h1>
        <p class="text-gray-600 mb-6">
          No pudimos encontrar el restaurante que buscas. Verifica la URL o contacta al soporte.
        </p>
        <NuxtLink
          to="/"
          class="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
        >
          <span class="mr-2">🏠</span>
          Volver al inicio
        </NuxtLink>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else-if="restaurant" class="restaurant-page">
      <RestaurantHeader :restaurant="restaurant" />

      <div class="mt-2">
        <PublicMenu
          :categories="categories"
          :products="products"
          :is-loading="pendingMenu"
          :restaurant-open="restaurant.is_currently_open ?? true"
          @product-click="handleProductClick"
        />
      </div>

      <!-- Cart Bottom Bar -->
      <CartBottomBar @open-cart="handleCartOpen" />

      <!-- Cart Drawer -->
      <CartDrawer
        v-model="isCartOpen"
        :restaurant-open="restaurant.is_currently_open ?? true"
        @checkout="handleCheckout"
        @open-product="handleOpenProductFromCart"
      />

      <!-- Product Detail Drawer -->
      <ProductDetailDrawer
        v-model="isProductDrawerOpen"
        :product="selectedProduct"
        :tenant-slug="String(tenantSlug)"
        @close="isProductDrawerOpen = false"
      />

      <!-- Cross-restaurant switch confirmation banner -->
      <Transition name="slide-up">
        <div
          v-if="switchDialogVisible"
          class="fixed bottom-0 left-0 right-0 z-[200] p-4 bg-background border-t border-border shadow-2xl"
          role="alertdialog"
          aria-live="assertive"
          aria-label="Cambio de restaurante"
        >
          <p class="text-sm text-center text-muted-foreground mb-3">
            Tu carrito tiene productos de
            <strong class="text-foreground">{{ cartStore.tenantName }}</strong>.
            Al continuar, tu carrito será vaciado.
          </p>
          <div class="flex items-center gap-2 justify-center">
            <button
              class="min-h-[44px] px-4 py-2 text-sm font-semibold bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="cartStore.isLoading"
              @click="confirmSwitch"
            >
              <span v-if="cartStore.isLoading">Vaciando...</span>
              <span v-else>Sí, continuar</span>
            </button>
            <button
              class="min-h-[44px] px-4 py-2 text-sm font-semibold bg-muted text-foreground rounded-lg hover:bg-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              @click="cancelSwitch"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.25s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

@media (prefers-reduced-motion: reduce) {
  .slide-up-enter-active,
  .slide-up-leave-active {
    transition: none;
  }
}
</style>
