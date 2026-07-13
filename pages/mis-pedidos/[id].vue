<script setup lang="ts">
import { inject, watch, onMounted, onUnmounted } from 'vue'
import { useOnlineOrderStatus } from '~/composables/useOnlineOrderStatus'
import { useFormatters } from '~/composables/useFormatters'
import { useNotifications, type Notification } from '~/composables/useNotifications'
import { useOrderNotification } from '~/composables/useOrderNotification'

definePageMeta({
  middleware: 'customer-auth',
  layout: 'customer-portal',
})

const route = useRoute()
const router = useRouter()
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

const { data, pending, error, refresh } = useAsyncData(
  'customer-order-' + orderId,
  () => $fetch<{ success: boolean; data: OrderDetail }>('/api/customer/orders/' + orderId),
  { server: false }
)

const order = computed<OrderDetail | null>(() => data.value?.data ?? null)

// Map customer API fields → DomiciliosOnlineOrderStatusTimeline expected fields
const statusHistoryForTimeline = computed(() =>
  (order.value?.status_history ?? []).map((entry, idx) => ({
    id: idx,
    old_status: null,
    new_status: entry.status,
    change_date: entry.changed_at,
    reason: entry.note,
  }))
)

useHead({ title: computed(() => order.value ? `Pedido #${order.value.order_number}` : 'Pedido') })

// Layout inject — dynamic title / back button
const setPageTitle      = inject<(title: string | undefined) => void>('setPageTitle')
const setShowBackButton = inject<(show: boolean) => void>('setShowBackButton')
const setBackHandler    = inject<(handler: (() => void) | undefined) => void>('setBackHandler')
const { setRefreshHandler } = useLayoutActions()

const goBack = () => router.push('/mis-pedidos')

watch(order, (newOrder) => {
  if (newOrder) {
    setPageTitle?.(`Pedido #${newOrder.order_number}`)
  }
}, { immediate: true })

// ── Order status notifications ─────────────────────────────────────────────

const { notifications, init: initNotifications, disconnect: disconnectNotifications } = useNotifications()
const { notify, reset: resetNotification } = useOrderNotification()

// Watch SSE notifications — fire notify() when a matching event arrives
// while the tab is hidden so the user sees the badge + title change
watch(notifications, (newList, oldList) => {
  const previousIds = new Set((oldList ?? []).map(n => n.id))
  const incoming = newList.filter(n => !previousIds.has(n.id))

  for (const n of incoming) {
    if (n.order_id === orderId && document.hidden) {
      notify('Tu pedido fue actualizado')
      // Refresh order data so the page is up to date when user returns
      refresh()
      break
    }
  }
}, { deep: true })

onMounted(() => {
  setShowBackButton?.(true)
  setBackHandler?.(goBack)
  setRefreshHandler?.(refresh)
  initNotifications()
})

onUnmounted(() => {
  setPageTitle?.(undefined)
  setShowBackButton?.(false)
  setBackHandler?.(undefined)
  setRefreshHandler?.(undefined)
  disconnectNotifications()
  resetNotification()
})

// Cancel flow
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

<template>
  <div>

    <!-- Loading State -->
    <div v-if="pending" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <p class="text-xl font-semibold text-text-primary mb-2">Error al cargar el pedido.</p>
        <p class="text-sm text-text-secondary mb-4">{{ error.message }}</p>
        <button
          class="min-h-[44px] px-4 py-2 bg-primary text-primary-foreground rounded-lg
                 hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          @click="refresh()"
        >
          Reintentar
        </button>
      </div>
    </div>

    <!-- Not found -->
    <div v-else-if="!order" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center space-y-4">
        <p class="text-base font-medium text-text-primary">Pedido no encontrado</p>
        <p class="text-sm text-text-secondary">Este pedido no existe o no te pertenece</p>
        <NuxtLink
          to="/mis-pedidos"
          class="inline-flex items-center justify-center min-h-[44px] px-6 rounded-lg
                 text-sm font-medium border border-border
                 hover:bg-surface-secondary transition-colors
                 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Ver mis pedidos
        </NuxtLink>
      </div>
    </div>

    <!-- Main content -->
    <div v-else class="space-y-6">

      <!-- ── Section 1: Info Cards ── -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Card 1: Restaurante -->
        <div class="bg-surface border border-border rounded-xl p-4">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Restaurante</p>
          <p class="text-lg font-bold text-text-primary truncate">{{ order.restaurant_name }}</p>
          <UiStatusBadge variant="info" format="text" class="mt-1 border-0" size="sm">
            {{ order.order_type === 'delivery' ? 'Domicilio' : order.order_type === 'pickup' ? 'Recogida' : 'En mesa' }}
          </UiStatusBadge>
        </div>

        <!-- Card 2: Pedido -->
        <div class="bg-surface border border-border rounded-xl p-4">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Pedido</p>
          <p class="text-lg font-bold text-text-primary">#{{ order.order_number }}</p>
          <p class="text-sm text-text-secondary mt-1">{{ formatDateTime(order.created_at) }}</p>
          <UiStatusBadge v-if="order.scheduled_time" variant="warning" size="sm" format="text" class="mt-1 border-0">
            Programado · {{ formatDateTime(order.scheduled_time) }}
          </UiStatusBadge>
          <UiStatusBadge v-else variant="success" size="sm" format="text" class="mt-1 border-0">
            Entrega inmediata
          </UiStatusBadge>
        </div>

        <!-- Card 3: Estado -->
        <div class="bg-surface border border-border rounded-xl p-4">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Estado</p>
          <UiStatusBadge :variant="getStatusVariant(order.status)" size="lg" format="text">
            {{ getStatusText(order.status, order.order_type) }}
          </UiStatusBadge>
        </div>

        <!-- Card 4: Total (primary accent) -->
        <div class="bg-surface border-2 border-primary rounded-xl p-4">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Total</p>
          <p class="text-2xl font-bold text-primary">{{ formatCurrency(order.total_amount) }}</p>
        </div>
      </div>

      <!-- ── Section 2: Items ── -->
      <div class="bg-surface border border-border rounded-xl overflow-hidden">
        <div class="p-6 border-b border-border">
          <h2 class="text-lg font-semibold text-text-primary">
            Productos ({{ order.items.length }})
          </h2>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full">
            <caption class="sr-only">Productos del pedido</caption>
            <thead class="bg-surface-secondary">
              <tr>
                <th class="px-6 py-3 text-start text-xs font-semibold text-text-primary uppercase tracking-wider">Producto</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-text-primary uppercase tracking-wider">Cant.</th>
                <th class="px-6 py-3 text-end text-xs font-semibold text-text-primary uppercase tracking-wider">Precio</th>
                <th class="px-6 py-3 text-end text-xs font-semibold text-text-primary uppercase tracking-wider">Subtotal</th>
              </tr>
            </thead>
            <tbody
              v-for="(item, index) in order.items"
              :key="index"
              class="divide-y divide-border"
            >
              <!-- Product Row -->
              <tr class="bg-surface hover:bg-surface-secondary/50 transition-colors">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-lg flex-shrink-0" aria-hidden="true">
                      🍽️
                    </div>
                    <span class="text-sm font-semibold text-text-primary">{{ item.product_name }}</span>
                  </div>
                </td>
                <td class="px-6 py-4 text-center">
                  <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {{ item.quantity }}
                  </span>
                </td>
                <td class="px-6 py-4 text-end">
                  <span class="text-sm font-medium text-text-primary">{{ formatCurrency(item.unit_price) }}</span>
                </td>
                <td class="px-6 py-4 text-end">
                  <span class="text-sm font-bold text-primary">{{ formatCurrency(item.subtotal) }}</span>
                </td>
              </tr>

              <!-- Modifier Rows -->
              <tr
                v-for="(mod, mIndex) in item.modifiers"
                :key="`mod-${index}-${mIndex}`"
                class="bg-surface-secondary/30"
              >
                <td class="px-6 py-2 ps-14">
                  <div class="flex items-center gap-2">
                    <span class="text-primary text-xs">+</span>
                    <span class="text-xs text-text-secondary">{{ mod.name }}</span>
                  </div>
                </td>
                <td class="px-6 py-2 text-center">
                  <span class="text-xs text-text-secondary">x{{ mod.quantity }}</span>
                </td>
                <td class="px-6 py-2 text-end">
                  <span class="text-xs text-text-secondary">{{ formatCurrency(mod.price) }}</span>
                </td>
                <td class="px-6 py-2 text-end">
                  <span class="text-xs text-primary/70">{{ formatCurrency(mod.price * mod.quantity) }}</span>
                </td>
              </tr>
            </tbody>
            <tfoot class="bg-surface-secondary border-t border-border">
              <tr v-if="order.subtotal !== order.total_amount">
                <td colspan="3" class="px-6 py-3 text-end text-sm text-text-secondary">
                  Subtotal
                </td>
                <td class="px-6 py-3 text-end">
                  <span class="text-sm text-text-primary">{{ formatCurrency(order.subtotal) }}</span>
                </td>
              </tr>
              <tr v-if="order.delivery_fee > 0">
                <td colspan="3" class="px-6 py-3 text-end text-sm text-text-secondary">
                  Domicilio
                </td>
                <td class="px-6 py-3 text-end">
                  <span class="text-sm text-text-primary">{{ formatCurrency(order.delivery_fee) }}</span>
                </td>
              </tr>
              <tr class="border-t-2 border-border">
                <td colspan="3" class="px-6 py-4 text-end text-sm font-semibold text-text-primary">
                  Total del pedido
                </td>
                <td class="px-6 py-4 text-end">
                  <span class="text-xl font-bold text-primary">{{ formatCurrency(order.total_amount) }}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- ── Section 3: Delivery / Pickup info ── -->
      <div class="bg-surface border border-border rounded-xl p-4 sm:p-6">

        <!-- Delivery -->
        <template v-if="order.order_type === 'delivery'">
          <h3 class="text-base sm:text-lg font-semibold text-text-primary flex items-center gap-2 mb-4">
            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Dirección de entrega</span>
          </h3>

          <div v-if="order.delivery_address" class="space-y-3">
            <div class="flex items-start gap-3">
              <svg class="w-4 h-4 text-text-secondary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <div>
                <p class="text-xs text-text-secondary mb-0.5">Dirección</p>
                <p class="text-sm font-medium text-text-primary">
                  {{ order.delivery_address.address_line1 }}<span v-if="order.delivery_address.address_line2">, {{ order.delivery_address.address_line2 }}</span>
                </p>
                <p v-if="order.delivery_address.city" class="text-xs text-text-secondary mt-0.5">
                  {{ order.delivery_address.city }}
                </p>
                <p v-if="order.delivery_address.delivery_notes" class="text-xs text-text-secondary italic mt-0.5">
                  {{ order.delivery_address.delivery_notes }}
                </p>
              </div>
            </div>

            <div v-if="order.delivery_instructions" class="flex items-start gap-3">
              <svg class="w-4 h-4 text-text-secondary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <div>
                <p class="text-xs text-text-secondary mb-0.5">Instrucciones</p>
                <p class="text-sm text-text-primary">{{ order.delivery_instructions }}</p>
              </div>
            </div>
          </div>
        </template>

        <!-- Pickup -->
        <template v-else-if="order.order_type === 'pickup'">
          <h3 class="text-base sm:text-lg font-semibold text-text-primary flex items-center gap-2 mb-4">
            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span>Recogida en restaurante</span>
          </h3>
          <div v-if="order.pickup_pin" class="flex items-center gap-3">
            <svg class="w-4 h-4 text-text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <div>
              <p class="text-xs text-text-secondary mb-0.5">Código de recogida</p>
              <p class="text-base font-bold text-text-primary tracking-widest">{{ order.pickup_pin }}</p>
            </div>
          </div>
        </template>

        <!-- Scheduled time (any type) -->
        <div class="flex items-start gap-3 mt-3">
          <svg class="w-4 h-4 text-text-secondary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p class="text-xs text-text-secondary mb-0.5">Hora programada</p>
            <p v-if="order.scheduled_time" class="text-sm font-medium text-text-primary">
              {{ formatDateTime(order.scheduled_time) }}
            </p>
            <div v-else class="flex items-center gap-2 mt-0.5">
              <span class="text-sm text-text-secondary">Sin hora programada</span>
              <UiStatusBadge variant="success" size="sm" format="text">Inmediato</UiStatusBadge>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Section 4: Status Timeline ── -->
      <div
        v-if="statusHistoryForTimeline.length"
        class="bg-surface border border-border rounded-xl p-4 sm:p-6"
      >
        <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4">Historial de estado</h3>
        <DomiciliosOnlineOrderStatusTimeline :history="statusHistoryForTimeline" :order-type="order.order_type" />
      </div>

      <!-- ── Section 5: Cancel ── -->
      <div v-if="order.can_cancel" class="space-y-3">
        <!-- Cancel trigger -->
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

        <!-- Inline confirm -->
        <div
          v-else
          class="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3"
        >
          <p class="text-sm font-medium text-destructive">¿Cancelar este pedido?</p>
          <p class="text-sm text-text-secondary">Esta acción no se puede deshacer.</p>
          <p v-if="cancelError" role="alert" class="text-sm text-destructive">{{ cancelError }}</p>
          <div class="flex gap-3">
            <button
              class="flex-1 min-h-[44px] px-4 rounded-lg text-sm font-medium
                     border border-border hover:bg-surface-secondary transition-colors
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
              <svg v-if="cancelling" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {{ cancelling ? 'Cancelando...' : 'Sí, cancelar' }}
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
