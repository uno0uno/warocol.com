<script setup lang="ts">
import PublicMenu from '~/components/public/PublicMenu.vue'
import ProductDetailDrawer from '~/components/online/ProductDetailDrawer.vue'
import TableQrCartBottomBar from '~/components/table-qr/TableQrCartBottomBar.vue'
import TableQrCartDrawer from '~/components/table-qr/TableQrCartDrawer.vue'
import { useCityCatalog } from '~/composables/useCityCatalog'
import { useTableQrCartStore } from '~/stores/table_qr_cart'

definePageMeta({
  layout: 'public-restaurant',
})

const route = useRoute()
const router = useRouter()
const tenantSlug = computed(() => String(route.params.tenant ?? ''))
const token = computed(() => String(route.params.token ?? ''))

const { isCitySlug } = useCityCatalog()
const isCity = computed(() => isCitySlug(tenantSlug.value))

const cartStore = useTableQrCartStore()
watch(token, (t) => { if (t) cartStore.setToken(t) }, { immediate: true })

interface ResolveData {
  tenant_slug: string
  display_name: string
  table_name: string
  is_currently_open: boolean
}

const { data: resolveData, status: resolveStatus, error: resolveError } = useQuery({
  key: () => ['table-qr', token.value, 'resolve'],
  query: () => $fetch<{ success: boolean; data: ResolveData }>(`/api/public/table-qr/${token.value}`),
  enabled: () => !!token.value && !isCity.value,
})

const resolve = computed(() => (resolveData.value as { data?: ResolveData } | null)?.data ?? null)

const slugMismatch = computed(
  () => resolve.value && resolve.value.tenant_slug !== tenantSlug.value,
)

const { data: menuData, status: menuStatus, error: menuError } = useQuery({
  key: () => ['table-qr', token.value, 'menu'],
  query: () => $fetch<{ success: boolean; data: { categories: any[]; products: any[]; restaurant_name: string; table_name: string; is_currently_open: boolean } }>(
    `/api/public/table-qr/${token.value}/menu`,
  ),
  enabled: () => !!token.value && !!resolve.value && !slugMismatch.value && !isCity.value,
})

const categories = computed(() => menuData.value?.data?.categories ?? [])
const products = computed(() => menuData.value?.data?.products ?? [])
const isOpen = computed(() => resolve.value?.is_currently_open ?? menuData.value?.data?.is_currently_open ?? false)
const orderingEnabled = computed(() => !!resolve.value && !slugMismatch.value)

const isLoading = computed(() => resolveStatus.value === 'pending' && !resolve.value)
const loadError = computed(() => resolveError.value || menuError.value || slugMismatch.value)

const isCartOpen = ref(false)
const isProductDrawerOpen = ref(false)
const selectedProduct = ref<Record<string, any> | null>(null)

useSeoMeta({
  title: () => resolve.value ? `${resolve.value.display_name} — Mesa ${resolve.value.table_name}` : 'Pedido en mesa',
})

const handleProductClick = (product: Record<string, any>) => {
  selectedProduct.value = product
  isProductDrawerOpen.value = true
}

const handleCheckout = () => {
  if (!orderingEnabled.value || !isOpen.value || cartStore.isEmpty) return
  router.push(`/${tenantSlug.value}/mesa/${token.value}/checkout`)
}
</script>

<template>
  <div v-if="isCity" class="min-h-screen flex items-center justify-center px-4">
    <p class="text-text-secondary">Enlace no válido.</p>
  </div>

  <div v-else-if="isLoading" class="min-h-[50vh] flex items-center justify-center">
    <CommonsTheCustomLoader size="large" />
  </div>

  <div v-else-if="loadError" class="min-h-[50vh] flex items-center justify-center px-4">
    <div class="text-center max-w-md">
      <div class="text-6xl mb-4">🔗</div>
      <h1 class="text-2xl font-bold text-foreground mb-2">Enlace no disponible</h1>
      <p class="text-muted-foreground mb-6">
        <template v-if="slugMismatch">
          Este código QR no corresponde a este restaurante.
        </template>
        <template v-else>
          El enlace de mesa no existe, está desactivado o el restaurante está cerrado.
        </template>
      </p>
      <NuxtLink to="/" class="text-primary font-semibold hover:underline">Volver al inicio</NuxtLink>
    </div>
  </div>

  <div v-else-if="resolve" class="min-h-screen bg-gray-50 pb-24">
    <div class="bg-card border-b border-border">
      <div class="max-w-7xl mx-auto px-4 py-6">
        <p class="text-xs font-semibold uppercase tracking-wide text-primary mb-1">Pedido en mesa</p>
        <h1 class="text-2xl font-bold text-foreground">{{ resolve.display_name }}</h1>
        <p class="text-text-secondary mt-1">
          Mesa <span class="font-semibold text-foreground">{{ resolve.table_name }}</span>
        </p>
        <p
          v-if="!isOpen"
          class="mt-3 text-sm text-destructive font-medium"
        >
          El restaurante está cerrado. Puedes ver el menú pero no enviar pedidos.
        </p>
      </div>
    </div>

    <PublicMenu
      :categories="categories"
      :products="products"
      :is-loading="menuStatus === 'pending'"
      :restaurant-open="isOpen"
      :accepts-online-orders="true"
      :ordering-enabled="orderingEnabled && isOpen"
      @product-click="handleProductClick"
    />

    <TableQrCartBottomBar
      :ordering-enabled="orderingEnabled && isOpen"
      @open-cart="isCartOpen = true"
    />

    <TableQrCartDrawer
      v-model="isCartOpen"
      :restaurant-open="isOpen"
      :ordering-enabled="orderingEnabled"
      @checkout="handleCheckout"
      @open-product="(p) => { selectedProduct = p; isProductDrawerOpen = true }"
    />

    <ProductDetailDrawer
      v-model="isProductDrawerOpen"
      :product="selectedProduct"
      :tenant-slug="tenantSlug"
      channel="table-qr"
      :table-qr-token="token"
    />
  </div>
</template>
