<script setup lang="ts">
import RestaurantHeader from '~/components/public/RestaurantHeader.vue'
import PublicMenu from '~/components/public/PublicMenu.vue'
import CartBottomBar from '~/components/online/CartBottomBar.vue'
import CartDrawer from '~/components/online/CartDrawer.vue'
import ProductDetailDrawer from '~/components/online/ProductDetailDrawer.vue'
import DirectoryView from '~/components/directory/DirectoryView.vue'
import { useOnlineCartStore } from '~/stores/online_cart'
import { useToast } from '~/composables/useToast'
import { useCityCatalog } from '~/composables/useCityCatalog'

const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const tenantSlug = route.params.tenant as string

// City vs tenant dispatch (warocol.com#615). The city catalog is prefetched
// in `plugins/city-catalog.server.ts` so `isCitySlug` is decidable
// synchronously during SSR — no hydration mismatch. When the slug is a city
// the tenant queries below stay disabled and `DirectoryView` renders.
const { isCitySlug } = useCityCatalog()
const isCity = computed(() => isCitySlug(tenantSlug))

definePageMeta({
  // City directory uses the default layout (no restaurant header / cart bar);
  // tenant profile keeps the public-restaurant layout. Resolved per-request.
  layout: false,
  // auth.global.js only skips routes with layout public-restaurant; this page
  // picks layout in-template — mark public so comensales are not sent to login.
  publicAccess: true,
})

// Initialize cart store (only matters for the tenant path)
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

// SSR data fetching — Pinia Colada + @pinia/colada-nuxt handles server-side prefetch automatically.
// `enabled` gates the queries off when the slug is a city — avoids a 404 burst on city pages.
const { data: profileData, status: profileStatus, asyncStatus: profileAsyncStatus, error: profileError, refetch: refetchProfile } = useQuery({
  key: () => ['restaurant', 'public', tenantSlug],
  query: () => $fetch(`/api/public/restaurant/${tenantSlug}`),
  enabled: () => !isCity.value,
})

const { data: menuData, status: menuStatus, asyncStatus: menuAsyncStatus, error: menuError, refetch: refetchMenu } = useQuery({
  key: () => ['restaurant', 'public', tenantSlug, 'menu'],
  query: () => $fetch(`/api/public/restaurant/${tenantSlug}/menu`),
  enabled: () => !isCity.value,
})

const restaurant = computed(() => (profileData.value as any)?.data || null)
const onlineOrdersAvailable = computed(() =>
  restaurant.value?.online_orders_available === true,
)
const customerOrderingOpen = computed(() =>
  (restaurant.value?.is_currently_open ?? true) && onlineOrdersAvailable.value
)
const onlineOrdersUnavailableMessage = computed(() =>
  restaurant.value?.online_orders_unavailable_message || 'Este restaurante no puede recibir pedidos en línea actualmente.',
)

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

const categories = computed(() => (menuData.value as any)?.data?.categories || [])
const products = computed(() => (menuData.value as any)?.data?.products || [])
const isLoading = computed(() => !profileData.value && !menuData.value)
const isRefreshing = computed(() =>
  (profileAsyncStatus.value === 'loading' && profileData.value != null) ||
  (menuAsyncStatus.value === 'loading' && menuData.value != null)
)
const error = computed(() => profileError.value || menuError.value)

onMounted(() => {
  if (!isCity.value) void refetchProfile()
})

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

// SEO
const siteUrl = config.public.siteUrl || 'https://warocol.com'

// Build sameAs array from social_media object
const sameAs = computed(() => {
  const sm = restaurant.value?.social_media
  if (!sm) return []
  return Object.values(sm).filter((v): v is string => typeof v === 'string' && v.startsWith('http'))
})

// Build hasMenuItem from top products (max 10 for schema size)
const menuItems = computed(() =>
  products.value.slice(0, 10).map((p: any) => ({
    '@type': 'MenuItem',
    name: p.name,
    description: p.description || undefined,
    image: p.image_url || undefined,  // Issue #465 — improves Google Rich Results
    offers: {
      '@type': 'Offer',
      price: p.price,
      priceCurrency: 'COP',
    },
  }))
)

const restaurantSchema = computed(() => {
  const r = restaurant.value
  if (!r) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: r.display_name,
    description: r.seo_description || r.description,
    image: [r.banner_url, r.logo_url].filter(Boolean),
    logo: r.logo_url ? { '@type': 'ImageObject', url: r.logo_url } : undefined,
    telephone: r.phone_number || undefined,
    email: r.email || undefined,
    url: `${siteUrl}/${tenantSlug}`,
    address: r.address ? {
      '@type': 'PostalAddress',
      streetAddress: [r.address, r.neighborhood].filter(Boolean).join(', '),
      addressLocality: r.city,
      addressCountry: 'CO',
    } : undefined,
    ...(r.latitude && r.longitude ? {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: r.latitude,
        longitude: r.longitude,
      }
    } : {}),
    openingHoursSpecification: formatOpeningHours(r.business_hours),
    ...(sameAs.value.length ? { sameAs: sameAs.value } : {}),
    hasMenu: {
      '@type': 'Menu',
      hasMenuItem: menuItems.value,
    },
    servesCuisine: 'Colombian',
    priceRange: '$$',
    currenciesAccepted: 'COP',
    paymentAccepted: 'Cash, Credit Card',
  }
})

useSeoMeta({
  title: () => restaurant.value?.seo_title || (restaurant.value ? `${restaurant.value.display_name} - Menú` : 'Cargando...'),
  description: () => restaurant.value?.seo_description || restaurant.value?.description || '',
  ogType: 'restaurant',
  ogSiteName: 'Waro Colombia',
  ogLocale: 'es_CO',
  ogTitle: () => restaurant.value?.seo_title || restaurant.value?.display_name || '',
  ogDescription: () => restaurant.value?.seo_description || restaurant.value?.description || '',
  ogImage: () => restaurant.value?.banner_url || restaurant.value?.logo_url || '',
  ogUrl: () => `${siteUrl}/${tenantSlug}`,
  twitterCard: 'summary_large_image',
  twitterSite: '@warocolombia',
  twitterTitle: () => restaurant.value?.seo_title || restaurant.value?.display_name || '',
  twitterDescription: () => restaurant.value?.seo_description || restaurant.value?.description || '',
  twitterImage: () => restaurant.value?.banner_url || restaurant.value?.logo_url || '',
})

useHead({
  link: [{ rel: 'canonical', href: () => `${siteUrl}/${tenantSlug}` }],
  script: [{
    type: 'application/ld+json',
    innerHTML: () => restaurantSchema.value ? JSON.stringify(restaurantSchema.value) : '{}',
  }],
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
  await Promise.all([refetchProfile(), refetchMenu()])
  if (!(restaurant.value?.accepts_online_orders ?? false)) {
    toast.error('Este restaurante no recibe pedidos en línea actualmente.')
    return
  }
  if (!onlineOrdersAvailable.value) {
    toast.error(onlineOrdersUnavailableMessage.value)
    return
  }
  if (!customerOrderingOpen.value) return

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
  // Wait for menu before purging — otherwise products=[] on slow devices
  // treats every cart line as "offline" and wipes the cart after the drawer opens.
  await Promise.all([refetchProfile(), refetchMenu()])
  if (menuError.value || !menuData.value) return

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
  <!-- City directory dispatch (warocol.com#615). When the URL slug matches a
       known public_cities entry, render the generic directory instead of the
       tenant profile. The catalog is prefetched on SSR so this branches
       synchronously and Vue does not see a hydration mismatch. -->
  <NuxtLayout v-if="isCity" name="default">
    <DirectoryView :city-slug="tenantSlug" />
  </NuxtLayout>

  <NuxtLayout v-else name="public-restaurant">
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
      <div v-if="isRefreshing" class="flex justify-end px-4 pt-2">
        <UiLoadingDots size="10px" class="text-text-secondary" />
      </div>
      <RestaurantHeader :restaurant="restaurant" />

      <div class="mt-2">
        <PublicMenu
          :categories="categories"
          :products="products"
          :is-loading="menuStatus === 'pending'"
          :restaurant-open="customerOrderingOpen"
          :accepts-online-orders="restaurant.accepts_online_orders ?? false"
          :online-orders-available="onlineOrdersAvailable"
          :online-orders-unavailable-message="onlineOrdersUnavailableMessage"
          @product-click="handleProductClick"
        />
      </div>

      <!-- Cart Bottom Bar -->
      <CartBottomBar
        :accepts-online-orders="restaurant.accepts_online_orders ?? false"
        :online-orders-available="onlineOrdersAvailable"
        @open-cart="handleCartOpen"
      />

      <!-- Cart Drawer -->
      <CartDrawer
        v-model="isCartOpen"
        :restaurant-open="customerOrderingOpen"
        :accepts-online-orders="restaurant.accepts_online_orders ?? false"
        :online-orders-available="onlineOrdersAvailable"
        :online-orders-unavailable-message="onlineOrdersUnavailableMessage"
        :min-order-amount="restaurant.min_order_amount ?? 0"
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
  </NuxtLayout>
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
