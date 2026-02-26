<script setup lang="ts">
import RestaurantHeader from '~/components/public/RestaurantHeader.vue'
import PublicMenu from '~/components/public/PublicMenu.vue'
import CartBottomBar from '~/components/online/CartBottomBar.vue'
import CartDrawer from '~/components/online/CartDrawer.vue'
import ProductDetailDrawer from '~/components/online/ProductDetailDrawer.vue'
import { useOnlineCartStore } from '~/stores/online_cart'

definePageMeta({
  layout: 'public-restaurant'
})

const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const tenantSlug = route.params.tenant

// Initialize cart store
const cartStore = useOnlineCartStore()

// Session init must happen before useFetch so sessionId is set at call time
if (process.client) {
  const storedSessionId = localStorage.getItem('waro_session_id')
  cartStore.initSession(storedSessionId)
}

// Cart drawer state
const isCartOpen = ref(false)

// Product detail drawer state
const isProductDrawerOpen = ref(false)
const selectedProduct = ref<Record<string, any> | null>(null)

// SSR data fetching — await ensures data is ready before rendering on server
const { data: profileData, error: profileError, pending: pendingProfile } = await useAsyncData(
  `restaurant-${tenantSlug}`,
  () => $fetch(`/api/public/restaurant/${tenantSlug}`),
  { server: true }
)

const { data: menuData, error: menuError, pending: pendingMenu } = await useAsyncData(
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
  cartStore.setTenant(val.tenant_id)
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


// Handle product click - Open detail drawer if has modifiers, else add directly
const handleProductClick = async (product) => {
  if (product.has_modifiers) {
    selectedProduct.value = product
    isProductDrawerOpen.value = true
  } else {
    try {
      await cartStore.addItem(
        { id: product.id, name: product.name, price: product.price },
        1,
        [],
        undefined
      )
    } catch (error) {
      console.error('Error al agregar producto:', error)
      alert('Error al agregar producto al carrito')
    }
  }
}

// Handle + button on a customizable cart item — open ingredient selector for 1 new unit
const handleOpenProductFromCart = (product: { id: string; name: string; price: number; has_modifiers: boolean }) => {
  selectedProduct.value = product
  isProductDrawerOpen.value = true
}

// Handle checkout - Navigate to delivery step
const handleCheckout = () => {
  router.push(`/${tenantSlug}/checkout`)
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
          @product-click="handleProductClick"
        />
      </div>

      <!-- Cart Bottom Bar -->
      <CartBottomBar @open-cart="isCartOpen = true" />

      <!-- Cart Drawer -->
      <CartDrawer
        v-model="isCartOpen"
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
    </div>
  </div>
</template>
