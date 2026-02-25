<template>
  <div class="max-w-2xl mx-auto px-4 py-8 space-y-6">

    <!-- Page header -->
    <div>
      <h1 class="text-2xl font-bold text-foreground">Mis pedidos</h1>
      <p v-if="customerEmail" class="text-sm text-muted-foreground mt-0.5">{{ customerEmail }}</p>
    </div>

    <!-- Loading skeletons -->
    <div v-if="pending" class="space-y-3" aria-busy="true" aria-label="Cargando pedidos">
      <div
        v-for="n in 3"
        :key="n"
        class="rounded-xl border border-border bg-card p-4 space-y-3"
      >
        <div class="flex items-center justify-between">
          <UiSkeleton size="sm" shape="rounded" class="w-20 h-4" />
          <UiSkeleton size="sm" shape="rounded" class="w-16 h-5" />
        </div>
        <UiSkeleton size="sm" shape="rounded" class="w-40 h-3" />
        <div class="flex items-center justify-between">
          <UiSkeleton size="sm" shape="rounded" class="w-24 h-4" />
          <UiSkeleton size="sm" shape="rounded" class="w-16 h-3" />
        </div>
      </div>
    </div>

    <!-- Error state -->
    <div
      v-else-if="error"
      class="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3"
    >
      <p class="text-base text-destructive">No se pudo cargar tus pedidos</p>
      <button
        class="min-h-[44px] px-4 rounded-lg text-sm font-medium border border-border
               hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
        @click="refresh()"
      >
        Reintentar
      </button>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="orders.length === 0"
      class="rounded-xl border border-border bg-card p-10 text-center space-y-4"
    >
      <div class="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center">
        <Icon name="heroicons:shopping-bag" class="w-7 h-7 text-muted-foreground" aria-hidden="true" />
      </div>
      <div>
        <p class="text-base font-medium text-foreground">Aún no tienes pedidos</p>
        <p class="text-sm text-muted-foreground mt-1">Haz tu primer pedido en nuestros restaurantes</p>
      </div>
      <NuxtLink
        to="/bogota"
        class="inline-flex items-center justify-center min-h-[44px] px-6 rounded-lg
               text-sm font-medium text-primary-foreground bg-primary
               hover:bg-primary/90 transition-colors
               focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Explorar restaurantes
      </NuxtLink>
    </div>

    <!-- Order list -->
    <ul v-else class="space-y-3" aria-label="Lista de pedidos">
      <li v-for="order in orders" :key="order.order_id">
        <NuxtLink
          :to="`/mis-pedidos/${order.order_id}`"
          class="block rounded-xl border border-border bg-card p-4 space-y-2
                 hover:border-primary/40 hover:shadow-sm transition-all
                 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          :aria-label="`Pedido #${order.order_number} — ${getStatusText(order.status)} — ${formatCurrency(order.total_amount)}`"
        >
          <!-- Row 1: order number + status badge -->
          <div class="flex items-center justify-between gap-2">
            <span class="text-base font-semibold text-foreground">#{{ order.order_number }}</span>
            <UiStatusBadge
              :variant="getStatusVariant(order.status)"
              size="sm"
              format="text"
            >
              {{ getStatusText(order.status) }}
            </UiStatusBadge>
          </div>

          <!-- Row 2: restaurant name -->
          <p class="text-sm text-muted-foreground leading-snug">{{ order.restaurant_name }}</p>

          <!-- Row 3: total + relative date -->
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-medium text-foreground">{{ formatCurrency(order.total_amount) }}</span>
            <span class="text-xs text-muted-foreground">{{ formatRelativeDate(order.created_at) }}</span>
          </div>
        </NuxtLink>
      </li>
    </ul>

  </div>
</template>

<script setup lang="ts">
import { useOtpAuthStore } from '~/stores/otp_auth'
import { useOnlineOrderStatus } from '~/composables/useOnlineOrderStatus'
import { useFormatters } from '~/composables/useFormatters'

definePageMeta({
  middleware: 'customer-auth',
  layout: 'dashboard',
  ssr: false,
})

useHead({ title: 'Mis pedidos — WARO' })

const otpStore = useOtpAuthStore()
const { getStatusText, getStatusVariant } = useOnlineOrderStatus()
const { formatCurrency, formatRelativeDate } = useFormatters()

interface OrderSummary {
  order_id: string
  order_number: number
  order_type: string
  status: string
  restaurant_name: string
  tenant_slug: string
  total_amount: number
  created_at: string
  item_count: number
}

// Fetch customer identity (authoritative — survives page refresh)
const { data: meData } = await useAsyncData('customer-me', () =>
  $fetch<{ customer_id: string; email: string }>('/api/customer/me')
)

// Hydrate store email if empty (e.g. after page refresh)
const customerEmail = computed(() => meData.value?.email ?? otpStore.email ?? '')
watch(meData, (me) => {
  if (me?.email && !otpStore.email) otpStore.email = me.email
}, { immediate: true })

// Fetch order list
const { data: ordersData, pending, error, refresh } = await useAsyncData(
  'customer-orders',
  () => $fetch<{ data: OrderSummary[] }>('/api/customer/orders')
)

const orders = computed<OrderSummary[]>(() => ordersData.value?.data ?? [])
</script>
