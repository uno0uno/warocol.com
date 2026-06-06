<script setup lang="ts">
import PublicMenu from '~/components/public/PublicMenu.vue'
import ProductDetailDrawer from '~/components/online/ProductDetailDrawer.vue'
import TableQrCartBottomBar from '~/components/table-qr/TableQrCartBottomBar.vue'
import TableQrCartDrawer from '~/components/table-qr/TableQrCartDrawer.vue'
import { useTableQrPage } from '~/composables/useTableQrPage'
import { useTableQrCartStore } from '~/stores/table_qr_cart'

definePageMeta({
  layout: 'public-restaurant',
  ssr: false,
})

const {
  tenantSlug,
  token,
  isCity,
  resolve,
  categories,
  products,
  isOpen,
  orderingEnabled,
  isInitialLoading,
  isMenuLoading,
  loadError,
} = useTableQrPage()

const cartStore = useTableQrCartStore()
watch(token, (t) => { if (t) cartStore.setToken(t) }, { immediate: true })

const isCartOpen = ref(false)
const isProductDrawerOpen = ref(false)
const selectedProduct = ref<Record<string, any> | null>(null)

useSeoMeta({
  title: () =>
    resolve.value
      ? `${resolve.value.display_name} — Mesa ${resolve.value.table_name}`
      : 'Pedido en mesa',
})

const handleProductClick = (product: Record<string, any>) => {
  selectedProduct.value = product
  isProductDrawerOpen.value = true
}

const toast = useToast()

const handleCheckout = async () => {
  if (cartStore.isEmpty) {
    toast.error('Agrega al menos un producto al carrito', { title: 'Carrito vacío' })
    return
  }
  if (!orderingEnabled.value) {
    toast.error('El pedido por QR no está disponible en este enlace', { title: 'No disponible' })
    return
  }
  if (!isOpen.value) {
    toast.error('El restaurante está cerrado; no puedes enviar pedidos ahora', { title: 'Cerrado' })
    return
  }
  const slug = resolve.value?.tenant_slug ?? tenantSlug.value
  await navigateTo(`/${slug}/mesa/${token.value}/checkout`)
}
</script>

<template>
  <div v-if="isCity" class="min-h-screen flex items-center justify-center px-4">
    <p class="text-text-secondary">Enlace no válido.</p>
  </div>

  <div v-else-if="isInitialLoading" class="min-h-[60vh] flex items-center justify-center">
    <CommonsTheCustomLoader size="large" />
  </div>

  <div v-else-if="loadError" class="min-h-[60vh] flex items-center justify-center px-4">
    <div class="text-center max-w-md">
      <div class="text-6xl mb-4">🔗</div>
      <h1 class="text-2xl font-bold text-foreground mb-2">Enlace no disponible</h1>
      <p class="text-muted-foreground mb-6">
        El enlace de mesa no existe, está desactivado o el restaurante está cerrado.
      </p>
      <NuxtLink to="/" class="text-primary font-semibold hover:underline">Volver al inicio</NuxtLink>
    </div>
  </div>

  <div v-else-if="resolve" class="min-h-screen bg-background pb-24">
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
      :is-loading="isMenuLoading"
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
      :tenant-slug="resolve.tenant_slug"
      channel="table-qr"
      :table-qr-token="token"
    />
  </div>
</template>
