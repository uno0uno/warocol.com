<template>
  <div class="max-w-2xl mx-auto px-4 py-8 space-y-6">

    <!-- Back link -->
    <NuxtLink
      to="/mis-pedidos"
      class="inline-flex items-center gap-1.5 text-sm text-muted-foreground
             hover:text-foreground transition-colors
             focus:outline-none focus:ring-2 focus:ring-ring rounded"
    >
      <Icon name="heroicons:arrow-left" class="w-4 h-4" aria-hidden="true" />
      Mis pedidos
    </NuxtLink>

    <!-- Loading skeletons -->
    <div v-if="pending" class="space-y-4" aria-busy="true" aria-label="Cargando pedido">
      <!-- Header skeleton -->
      <div class="rounded-xl border border-border bg-card p-4 space-y-3">
        <div class="flex items-center justify-between">
          <UiSkeleton size="sm" shape="rounded" class="w-28 h-6" />
          <UiSkeleton size="sm" shape="rounded" class="w-20 h-5" />
        </div>
        <UiSkeleton size="sm" shape="rounded" class="w-36 h-4" />
        <UiSkeleton size="sm" shape="rounded" class="w-44 h-3" />
      </div>
      <!-- Items skeleton -->
      <div class="rounded-xl border border-border bg-card p-4 space-y-3">
        <UiSkeleton size="sm" shape="rounded" class="w-16 h-4" />
        <div v-for="n in 2" :key="n" class="space-y-1 pt-2 border-t border-border first:border-0 first:pt-0">
          <div class="flex items-center justify-between">
            <UiSkeleton size="sm" shape="rounded" class="w-40 h-4" />
            <UiSkeleton size="sm" shape="rounded" class="w-16 h-4" />
          </div>
          <UiSkeleton size="sm" shape="rounded" class="w-24 h-3" />
        </div>
      </div>
      <!-- Totals skeleton -->
      <div class="rounded-xl border border-border bg-card p-4 space-y-2">
        <div class="flex items-center justify-between">
          <UiSkeleton size="sm" shape="rounded" class="w-20 h-4" />
          <UiSkeleton size="sm" shape="rounded" class="w-16 h-4" />
        </div>
        <div class="flex items-center justify-between">
          <UiSkeleton size="sm" shape="rounded" class="w-12 h-5" />
          <UiSkeleton size="sm" shape="rounded" class="w-20 h-5" />
        </div>
      </div>
    </div>

    <!-- Error state -->
    <div
      v-else-if="error"
      class="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3"
    >
      <p class="text-base text-destructive">No se pudo cargar el pedido</p>
      <button
        class="min-h-[44px] px-4 rounded-lg text-sm font-medium border border-border
               hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
        @click="refresh()"
      >
        Reintentar
      </button>
    </div>

    <!-- Not found state -->
    <div
      v-else-if="!order"
      class="rounded-xl border border-border bg-card p-10 text-center space-y-4"
    >
      <div class="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center">
        <Icon name="heroicons:document-magnifying-glass" class="w-7 h-7 text-muted-foreground" aria-hidden="true" />
      </div>
      <div>
        <p class="text-base font-medium text-foreground">Pedido no encontrado</p>
        <p class="text-sm text-muted-foreground mt-1">Este pedido no existe o no te pertenece</p>
      </div>
      <NuxtLink
        to="/mis-pedidos"
        class="inline-flex items-center justify-center min-h-[44px] px-6 rounded-lg
               text-sm font-medium border border-border
               hover:bg-muted transition-colors
               focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Ver mis pedidos
      </NuxtLink>
    </div>

    <!-- Content -->
    <template v-else>

      <!-- Section A: Order Header -->
      <div class="rounded-xl border border-border bg-card p-4 space-y-3">
        <div class="flex items-start justify-between gap-2">
          <h1 class="text-xl font-bold text-foreground">#{{ order.order_number }}</h1>
          <UiStatusBadge
            :variant="getStatusVariant(order.status)"
            size="sm"
            format="text"
          >
            {{ getStatusText(order.status) }}
          </UiStatusBadge>
        </div>
        <p class="text-sm font-medium text-foreground">{{ order.restaurant_name }}</p>
        <p class="text-sm text-muted-foreground">{{ formatDateTime(order.created_at) }}</p>
        <p v-if="order.payment_method" class="text-xs text-muted-foreground capitalize">
          Pago: {{ order.payment_method }}
        </p>
      </div>

      <!-- Section B: Items List -->
      <div class="rounded-xl border border-border bg-card p-4 space-y-1">
        <h2 class="text-sm font-semibold text-foreground mb-3">Productos</h2>
        <ul class="divide-y divide-border">
          <li
            v-for="(item, index) in order.items"
            :key="index"
            class="py-3 first:pt-0 last:pb-0 space-y-1"
          >
            <!-- Item row -->
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-foreground leading-snug">{{ item.product_name }}</p>
                <p class="text-xs text-muted-foreground">
                  {{ item.quantity }} × {{ formatCurrency(item.unit_price) }}
                </p>
              </div>
              <span class="text-sm font-medium text-foreground shrink-0">
                {{ formatCurrency(item.subtotal) }}
              </span>
            </div>
            <!-- Modifiers -->
            <ul
              v-if="item.modifiers && item.modifiers.length"
              class="pl-3 space-y-0.5"
            >
              <li
                v-for="(mod, mIndex) in item.modifiers"
                :key="mIndex"
                class="text-xs text-muted-foreground flex items-center justify-between gap-2"
              >
                <span>
                  <span v-if="mod.quantity > 1">{{ mod.quantity }}× </span>{{ mod.name }}
                </span>
                <span v-if="mod.price > 0">+{{ formatCurrency(mod.price * mod.quantity) }}</span>
              </li>
            </ul>
          </li>
        </ul>
      </div>

      <!-- Section C: Delivery / Pickup Info -->
      <div
        v-if="order.order_type === 'delivery' && order.delivery_address"
        class="rounded-xl border border-border bg-card p-4 space-y-1"
      >
        <h2 class="text-sm font-semibold text-foreground mb-2">Dirección de entrega</h2>
        <p class="text-sm text-foreground">{{ order.delivery_address.address_line1 }}</p>
        <p v-if="order.delivery_address.address_line2" class="text-sm text-muted-foreground">
          {{ order.delivery_address.address_line2 }}
        </p>
        <p v-if="order.delivery_address.city" class="text-sm text-muted-foreground">
          {{ order.delivery_address.city }}
        </p>
        <p v-if="order.delivery_address.delivery_notes" class="text-xs text-muted-foreground mt-1">
          Nota: {{ order.delivery_address.delivery_notes }}
        </p>
        <p
          v-if="order.delivery_instructions"
          class="text-xs text-muted-foreground mt-1"
        >
          Instrucciones: {{ order.delivery_instructions }}
        </p>
        <p
          v-if="order.scheduled_time"
          class="text-xs text-muted-foreground mt-1"
        >
          Programado para: {{ formatDateTime(order.scheduled_time) }}
        </p>
      </div>

      <div
        v-else-if="order.order_type === 'pickup'"
        class="rounded-xl border border-border bg-card p-4 space-y-1"
      >
        <h2 class="text-sm font-semibold text-foreground mb-2">Recogida en restaurante</h2>
        <div v-if="order.pickup_pin" class="flex items-center gap-2">
          <span class="text-sm text-muted-foreground">Código de recogida:</span>
          <span class="text-base font-bold text-foreground tracking-widest">{{ order.pickup_pin }}</span>
        </div>
        <p
          v-if="order.scheduled_time"
          class="text-xs text-muted-foreground"
        >
          Programado para: {{ formatDateTime(order.scheduled_time) }}
        </p>
      </div>

      <!-- Section D: Totals -->
      <div class="rounded-xl border border-border bg-card p-4 space-y-2">
        <h2 class="text-sm font-semibold text-foreground mb-1">Resumen</h2>
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground">Subtotal</span>
          <span class="text-foreground">{{ formatCurrency(order.subtotal) }}</span>
        </div>
        <div v-if="order.delivery_fee > 0" class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground">Domicilio</span>
          <span class="text-foreground">{{ formatCurrency(order.delivery_fee) }}</span>
        </div>
        <div class="flex items-center justify-between text-sm font-bold pt-2 border-t border-border">
          <span class="text-foreground">Total</span>
          <span class="text-foreground">{{ formatCurrency(order.total_amount) }}</span>
        </div>
      </div>

      <!-- Section E: Cancel -->
      <div v-if="order.can_cancel" class="space-y-3">
        <!-- Cancel trigger button -->
        <button
          v-if="!showCancelConfirm"
          class="w-full min-h-[44px] px-4 rounded-xl text-sm font-medium
                 border border-destructive/40 text-destructive
                 hover:bg-destructive/5 transition-colors
                 focus:outline-none focus:ring-2 focus:ring-destructive/50"
          @click="showCancelConfirm = true"
        >
          Cancelar pedido
        </button>

        <!-- Inline cancel confirmation -->
        <div
          v-else
          class="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3"
        >
          <p class="text-sm font-medium text-destructive">¿Cancelar este pedido?</p>
          <p class="text-sm text-muted-foreground">Esta acción no se puede deshacer.</p>
          <p v-if="cancelError" class="text-sm text-destructive">{{ cancelError }}</p>
          <div class="flex gap-3">
            <button
              class="flex-1 min-h-[44px] px-4 rounded-lg text-sm font-medium
                     border border-border hover:bg-muted transition-colors
                     focus:outline-none focus:ring-2 focus:ring-ring
                     disabled:opacity-50"
              :disabled="cancelling"
              @click="showCancelConfirm = false; cancelError = ''"
            >
              No, mantener
            </button>
            <button
              class="flex-1 min-h-[44px] px-4 rounded-lg text-sm font-medium
                     bg-destructive text-destructive-foreground
                     hover:bg-destructive/90 transition-colors
                     focus:outline-none focus:ring-2 focus:ring-destructive/50
                     disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2"
              :disabled="cancelling"
              @click="confirmCancel"
            >
              <Icon
                v-if="cancelling"
                name="heroicons:arrow-path"
                class="w-4 h-4 animate-spin"
                aria-hidden="true"
              />
              {{ cancelling ? 'Cancelando...' : 'Sí, cancelar' }}
            </button>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { useOnlineOrderStatus } from '~/composables/useOnlineOrderStatus'
import { useFormatters } from '~/composables/useFormatters'

definePageMeta({
  middleware: 'customer-auth',
  layout: 'public-restaurant',
})

const route = useRoute()
const orderId = route.params.id as string

const { getStatusText, getStatusVariant } = useOnlineOrderStatus()
const { formatCurrency, formatDateTime } = useFormatters()

interface OrderModifier {
  name: string
  price: number
  quantity: number
}

interface OrderItem {
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
  modifiers: OrderModifier[]
}

interface DeliveryAddress {
  address_line1: string
  address_line2: string | null
  city: string | null
  delivery_notes: string | null
  label: string | null
}

interface StatusHistoryEntry {
  status: string
  changed_at: string
  note: string | null
}

interface OrderDetail {
  order_id: string
  order_number: number
  order_type: string
  status: string
  restaurant_name: string
  tenant_slug: string
  verified_email: string | null
  created_at: string
  scheduled_time: string | null
  delivery_instructions: string | null
  delivery_address: DeliveryAddress | null
  pickup_pin: string | null
  payment_method: string | null
  items: OrderItem[]
  subtotal: number
  delivery_fee: number
  total_amount: number
  can_cancel: boolean
  status_history: StatusHistoryEntry[]
}

const { data, pending, error, refresh } = await useAsyncData(
  'customer-order-' + orderId,
  () => $fetch<{ success: boolean; data: OrderDetail }>('/api/customer/orders/' + orderId)
)

const order = computed<OrderDetail | null>(() => data.value?.data ?? null)

useHead({ title: computed(() => order.value ? `Pedido #${order.value.order_number} — WARO` : 'Pedido — WARO') })

// Cancel state
const showCancelConfirm = ref(false)
const cancelling = ref(false)
const cancelError = ref('')

async function confirmCancel() {
  cancelling.value = true
  cancelError.value = ''
  try {
    await $fetch('/api/customer/orders/' + orderId + '/cancel', { method: 'POST' })
    showCancelConfirm.value = false
    await refresh()
  } catch {
    cancelError.value = 'No se pudo cancelar el pedido. Intenta de nuevo.'
  } finally {
    cancelling.value = false
  }
}
</script>
