<script setup lang="ts">
import { inject, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { Printer } from 'lucide-vue-next'
import type { ComandaPrintPayload } from '~/composables/useComandaPrint'
import { printComandaTickets } from '~/composables/useComandaPrint'

definePageMeta({ layout: 'dashboard', module: 'despacho' })
const { t } = useI18n({ useScope: 'global' })
useHead({ title: () => t('despacho.head.detallePedido') })

const route = useRoute()
const router = useRouter()
const orderId = computed(() => route.params.id as string)
const { formatDate, formatDateTime, formatCurrency } = useFormatters()
const { businessProfile, currentTenant } = useTenantReactive()

const { data: orderResponse, status: orderStatus, asyncStatus: orderAsyncStatus, error: fetchError, refetch: refetchOrder } = useQuery({
  key: () => ['online-orders', orderId.value],
  query: () => $fetch(`/api/online/orders/${orderId.value}`),
  enabled: () => !!orderId.value,
})

const order = computed(() => (orderResponse.value as any)?.data ?? null)
const isLoading = computed(() => !orderResponse.value && !fetchError.value)

const { data: historyResponse, status: historyStatus, asyncStatus: historyAsyncStatus, error: historyError, refetch: refetchHistory } = useQuery({
  key: () => ['online-orders', orderId.value, 'status-history'],
  query: () => $fetch(`/api/online/orders/${orderId.value}/status-history`),
  enabled: () => !!orderId.value,
})
const isHistoryLoading = computed(() => historyStatus.value === 'loading')
const isRefreshing = computed(() =>
  (orderAsyncStatus.value === 'loading' && orderResponse.value != null) ||
  (historyAsyncStatus.value === 'loading' && historyResponse.value != null)
)

const statusHistory = computed(() => (historyResponse.value as any)?.data ?? [])

const isStatusUpdating = ref(false)
const statusUpdateError = ref<string | null>(null)

// ── Payment-method capture on delivered (warocol.com#606) ────────────────────
interface PaymentSelection {
  slug: string
  id: string | null
}

const paymentModal = ref<{ open: boolean }>({ open: false })
const paymentSelection = ref<PaymentSelection>({ slug: '', id: null })
const paymentSubmitError = ref<string | null>(null)

const { data: paymentMethodsResponse } = useQuery({
  key: () => ['online-orders', 'payment-methods'],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/online/orders/payment-methods'),
  staleTime: 5 * 60_000,
})
const paymentGroups = computed(() => paymentMethodsResponse.value?.data ?? [])

const selectedGroupHasMethods = computed(() => {
  const g = paymentGroups.value.find((x: any) => x.slug === paymentSelection.value.slug)
  return (g?.methods?.length ?? 0) > 0
})
const canConfirmDelivered = computed(() => {
  if (!paymentSelection.value.slug) return false
  if (selectedGroupHasMethods.value && !paymentSelection.value.id) return false
  return true
})

const openDeliveredCapture = () => {
  if (order.value?.payment_method) {
    // Order already has captured payment (future online-gateway scenario) —
    // skip the modal entirely.
    void updateStatus('delivered')
    return
  }
  paymentSelection.value = { slug: '', id: null }
  paymentSubmitError.value = null
  paymentModal.value.open = true
}

const closePaymentModal = () => {
  if (isStatusUpdating.value) return
  paymentModal.value.open = false
}

const confirmDelivered = async () => {
  if (!canConfirmDelivered.value || isStatusUpdating.value) return
  paymentSubmitError.value = null
  try {
    await updateStatus('delivered', {
      payment_method: paymentSelection.value.slug,
      payment_method_id: paymentSelection.value.id ?? null,
    })
    if (!statusUpdateError.value) {
      paymentModal.value.open = false
    } else {
      paymentSubmitError.value = typeof statusUpdateError.value === 'string'
        ? statusUpdateError.value
        : (statusUpdateError.value as any)?.message ?? t('despacho.detail.savePaymentError')
    }
  } catch (err: any) {
    paymentSubmitError.value = err?.data?.detail?.message ?? err?.message ?? t('despacho.detail.savePaymentError')
  }
}

const updateStatus = async (newStatus: string, extra: Record<string, unknown> = {}) => {
  if (!order.value || isStatusUpdating.value) return
  isStatusUpdating.value = true
  statusUpdateError.value = null
  try {
    await $fetch(`/api/online/orders/${orderId.value}/status`, {
      method: 'PATCH',
      body: { new_status: newStatus, ...extra },
    })
    await refetchOrder()
    await refetchHistory()
  } catch (err: any) {
    statusUpdateError.value = err?.data?.detail ?? err?.message ?? t('despacho.detail.updateStatusError')
  } finally {
    isStatusUpdating.value = false
  }
}

const confirmOrder = () => updateStatus('confirmed', { auto_complete: true })

const orderTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    delivery: t('despacho.orderTypes.delivery'),
    pickup: t('despacho.orderTypes.pickup'),
    'dine-in': t('despacho.orderTypes.dineIn'),
  }
  return labels[type] ?? type
}

const { getStatusText, getStatusVariant } = useOnlineOrderStatus()

const goBack = () => router.push('/despacho/domicilios')

const modifierQuantity = (modifier: any) => {
  const quantity = Number(modifier?.quantity)
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1
}

const formatQuantity = (quantity: number) =>
  quantity % 1 === 0 ? quantity.toFixed(0) : String(quantity)

const modifierSubtotal = (modifier: any) =>
  Number(modifier?.price || 0) * modifierQuantity(modifier)

const businessName = computed(() =>
  businessProfile.value?.display_name
  || currentTenant.value?.name
  || 'WARO'
)

const printLocationLabel = computed(() => {
  if (!order.value) return null
  if (order.value.order_type === 'delivery') return t('despacho.orderTypes.delivery')
  if (order.value.order_type === 'pickup') return t('despacho.orderTypes.pickup')
  return orderTypeLabel(order.value.order_type)
})

const comandaPrintPayload = computed<ComandaPrintPayload[]>(() => {
  const currentOrder = order.value
  if (!currentOrder) return []
  return [{
    id: currentOrder.id,
    comanda_number: currentOrder.order_number ?? `ONLINE-${orderId.value.slice(0, 8)}`,
    station_name: printLocationLabel.value || t('despacho.orderTypes.delivery'),
    table_display_name: printLocationLabel.value,
    fired_at: currentOrder.scheduled_time ?? currentOrder.order_date,
    items: (currentOrder.items ?? []).map((item: any) => ({
      kitchen_name: item.product_name ?? item.name ?? t('despacho.common.productFallback'),
      quantity: Number(item.quantity ?? 1),
      modifiers_snapshot: (item.modifiers ?? []).map((mod: any) => ({
        name: mod.name,
        price: mod.price,
        quantity: modifierQuantity(mod),
      })),
      notes: item.notes ?? null,
    })),
  }]
})

const canPrintComanda = computed(() =>
  !!order.value && comandaPrintPayload.value.some(comanda => comanda.items.length > 0),
)

async function printOrderComanda() {
  if (!canPrintComanda.value) return
  await nextTick()
  printComandaTickets()
}

// Dashboard layout inject — dynamic back button
const setShowBackButton = inject<(show: boolean) => void>('setShowBackButton')
const setBackHandler    = inject<(handler: (() => void) | undefined) => void>('setBackHandler')

// Header refresh button + progressive loader (parity with /ventas/ordenes)
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
const refreshAll = async () => {
  await Promise.all([refetchOrder(), refetchHistory()])
}
onMounted(() => {
  setShowBackButton?.(true)
  setBackHandler?.(goBack)
  setRefreshHandler(refreshAll)
})
registerProgressiveLoading(isRefreshing)

onUnmounted(() => {
  setShowBackButton?.(false)
  setBackHandler?.(undefined)
  clearRefreshHandler(refreshAll)
})
</script>

<template>
  <div class="page-layout">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="fetchError" />

    <!-- Main Content -->
    <div v-else-if="order" class="space-y-6">
      <!-- ── Section 1: Info Cards ── -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Card 1: Cliente -->
        <div class="bg-surface border border-border rounded-xl p-4">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">{{ t('despacho.common.customer') }}</p>
          <p class="text-lg font-bold text-text-primary truncate">{{ order.verified_email ?? '—' }}</p>
          <p class="text-sm text-text-secondary mt-1 truncate">{{ order.customer_phone || t('despacho.common.noPhone') }}</p>
        </div>

        <!-- Card 2: Pedido -->
        <div class="bg-surface border border-border rounded-xl p-4">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">{{ t('despacho.detail.order') }}</p>
          <p class="text-lg font-bold text-text-primary">#{{ order.order_number }}</p>
          <p class="text-sm text-text-secondary mt-1">{{ formatDate(order.order_date) }}</p>
          <UiStatusBadge v-if="order.scheduled_time" variant="warning" size="sm" format="text" class="mt-1 border-0">
            {{ t('despacho.detail.scheduledAt', { date: formatDateTime(order.scheduled_time) }) }}
          </UiStatusBadge>
          <UiStatusBadge v-else variant="success" size="sm" format="text" class="mt-1 border-0">
            {{ t('despacho.detail.immediateDelivery') }}
          </UiStatusBadge>
        </div>

        <!-- Card 3: Estado -->
        <div class="bg-surface border border-border rounded-xl p-4">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">{{ t('despacho.common.status') }}</p>
          <UiStatusBadge :variant="getStatusVariant(order.status)" size="lg" format="text">
            {{ getStatusText(order.status, order.order_type) }}
          </UiStatusBadge>
        </div>

        <!-- Card 4: Total (primary accent) -->
        <div class="bg-surface border-2 border-primary rounded-xl p-4">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">{{ t('despacho.common.total') }}</p>
          <p class="text-2xl font-bold text-primary">{{ formatCurrency(order.total_amount) }}</p>
        </div>
      </div>

      <!-- ── Section 1.5: Status Actions ── -->
      <div class="bg-surface border border-border rounded-xl p-4 sm:p-6">
        <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">{{ t('despacho.detail.orderActions') }}</p>

        <!-- Terminal states -->
        <div v-if="order.status === 'completed'" class="flex flex-col sm:flex-row sm:items-center gap-3">
          <span class="text-sm text-text-secondary">
            {{ order.order_type === 'delivery' ? t('despacho.detail.orderAccepted') : t('despacho.detail.orderCompleted') }}
            {{ t('despacho.detail.noMoreActions') }}
          </span>
          <UiButton
            variant="crocus-outline"
            size="lg"
            class="gap-2 sm:ms-auto"
            :disabled="!canPrintComanda"
            :aria-label="t('despacho.common.printComanda')"
            :title="t('despacho.common.printComanda')"
            @click="printOrderComanda"
          >
            <Printer class="h-4 w-4" aria-hidden="true" />
            <span>{{ t('despacho.common.print') }}</span>
          </UiButton>
        </div>
        <div v-else-if="order.status === 'cancelled'" class="flex flex-col sm:flex-row sm:items-center gap-3">
          <span class="text-sm text-text-secondary">{{ t('despacho.detail.orderCancelled') }} {{ t('despacho.detail.noMoreActions') }}</span>
          <UiButton
            variant="crocus-outline"
            size="lg"
            class="gap-2 sm:ms-auto"
            :disabled="!canPrintComanda"
            :aria-label="t('despacho.common.printComanda')"
            :title="t('despacho.common.printComanda')"
            @click="printOrderComanda"
          >
            <Printer class="h-4 w-4" aria-hidden="true" />
            <span>{{ t('despacho.common.print') }}</span>
          </UiButton>
        </div>

        <!-- Active states -->
        <div v-else class="flex flex-col sm:flex-row gap-3">
          <UiButton v-if="order.status === 'pending'" size="lg" :disabled="isStatusUpdating" @click="confirmOrder()">
            {{ isStatusUpdating ? t('despacho.detail.confirming') : t('despacho.detail.confirmOrder') }}
          </UiButton>
          <UiButton v-else-if="order.status === 'confirmed'" size="lg" :disabled="isStatusUpdating" @click="updateStatus('preparing')">
            {{ isStatusUpdating ? t('despacho.detail.updating') : t('despacho.detail.markPreparing') }}
          </UiButton>
          <UiButton v-else-if="order.status === 'preparing'" size="lg" :disabled="isStatusUpdating" @click="openDeliveredCapture">
            {{ isStatusUpdating ? t('despacho.detail.updating') : t('despacho.detail.markDelivered') }}
          </UiButton>
          <UiButton v-else-if="order.status === 'delivered'" size="lg" :disabled="isStatusUpdating" @click="updateStatus('completed')">
            {{ isStatusUpdating ? t('despacho.detail.completing') : t('despacho.detail.completeOrder') }}
          </UiButton>

          <UiButton
            v-if="['pending', 'confirmed', 'preparing'].includes(order.status)"
            variant="destructive"
            size="lg"
            :disabled="isStatusUpdating"
            @click="updateStatus('cancelled')"
          >
            {{ isStatusUpdating ? t('despacho.detail.cancelling') : t('despacho.detail.cancelOrder') }}
          </UiButton>
          <UiButton
            variant="crocus-outline"
            size="lg"
            class="gap-2"
            :disabled="isStatusUpdating || !canPrintComanda"
            :aria-label="t('despacho.common.printComanda')"
            :title="t('despacho.common.printComanda')"
            @click="printOrderComanda"
          >
            <Printer class="h-4 w-4" aria-hidden="true" />
            <span>{{ t('despacho.common.print') }}</span>
          </UiButton>
        </div>

        <p v-if="statusUpdateError" role="alert" class="mt-3 text-sm text-destructive">{{ statusUpdateError }}</p>
      </div>

      <!-- ── Section 2: Items ── -->
      <div class="bg-surface border border-border rounded-xl overflow-hidden">
        <div class="p-6 border-b border-border">
          <h2 class="text-lg font-semibold text-text-primary">{{ t('despacho.detail.orderItemsTitle', { count: order.items.length }) }}</h2>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full">
            <caption class="sr-only">{{ t('despacho.detail.orderItemsCaption') }}</caption>
            <thead class="bg-surface-secondary">
              <tr>
                <th class="px-6 py-3 text-start text-xs font-semibold text-text-primary uppercase tracking-wider">{{ t('despacho.common.product') }}</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-text-primary uppercase tracking-wider">{{ t('despacho.common.quantityShort') }}</th>
                <th class="px-6 py-3 text-end text-xs font-semibold text-text-primary uppercase tracking-wider">{{ t('despacho.common.price') }}</th>
                <th class="px-6 py-3 text-end text-xs font-semibold text-text-primary uppercase tracking-wider">{{ t('despacho.common.subtotal') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <template v-for="item in order.items" :key="item.id">
                <!-- Product Row -->
                <tr class="bg-surface hover:bg-surface-secondary/50 transition-colors">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-lg flex-shrink-0" aria-hidden="true">
                        🍽️
                      </div>
                      <div class="min-w-0">
                        <span class="text-sm font-semibold text-text-primary">{{ item.product_name }}</span>
                        <p v-if="item.notes" class="text-xs italic text-text-secondary mt-1">{{ item.notes }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {{ item.quantity % 1 === 0 ? item.quantity.toFixed(0) : item.quantity }}
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
                  v-for="mod in item.modifiers"
                  :key="`mod-${mod.name}`"
                  class="bg-surface-secondary/30"
                >
                  <td class="px-6 py-2 ps-14">
                    <div class="flex items-center gap-2">
                      <span class="text-primary text-xs">+</span>
                      <span class="text-xs text-text-secondary">{{ mod.name }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-2 text-center">
                    <span class="text-xs text-text-tertiary">x{{ formatQuantity(modifierQuantity(mod)) }}</span>
                  </td>
                  <td class="px-6 py-2 text-end">
                    <span class="text-xs text-text-secondary">{{ formatCurrency(mod.price) }}</span>
                  </td>
                  <td class="px-6 py-2 text-end">
                    <span class="text-xs text-primary/70">{{ formatCurrency(modifierSubtotal(mod)) }}</span>
                  </td>
                </tr>
              </template>
            </tbody>
            <tfoot class="bg-surface-secondary border-t-2 border-border">
              <tr>
                <td colspan="3" class="px-6 py-4 text-end text-sm font-semibold text-text-primary">
                  {{ t('despacho.common.orderTotal') }}
                </td>
                <td class="px-6 py-4 text-end">
                  <span class="text-xl font-bold text-primary">{{ formatCurrency(order.total_amount) }}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- ── Section 3: Delivery / pickup info ── -->
      <div class="bg-surface border border-border rounded-xl p-4 sm:p-6">

        <!-- Delivery -->
        <template v-if="order.order_type === 'delivery'">
          <h3 class="text-base sm:text-lg font-semibold text-text-primary flex items-center gap-2 mb-4">
            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{{ t('despacho.detail.deliveryAddress') }}</span>
          </h3>

          <div v-if="order.delivery_address" class="space-y-3">
            <!-- Street -->
            <div class="flex items-start gap-3">
              <svg class="w-4 h-4 text-text-secondary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <div>
                <p class="text-xs text-text-secondary mb-0.5">{{ t('despacho.detail.address') }}</p>
                <p class="text-sm font-medium text-text-primary">
                  {{ order.delivery_address.address_line1 }}<span v-if="order.delivery_address.address_line2">, {{ order.delivery_address.address_line2 }}</span>
                </p>
                <p v-if="order.delivery_address.delivery_notes" class="text-xs text-text-secondary italic mt-0.5">
                  {{ order.delivery_address.delivery_notes }}
                </p>
              </div>
            </div>

            <!-- City + label -->
            <div class="flex items-center gap-3">
              <svg class="w-4 h-4 text-text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-text-primary">{{ order.delivery_address.city }}</span>
                <UiStatusBadge v-if="order.delivery_address.label" variant="secondary" size="sm" format="text">
                  {{ order.delivery_address.label }}
                </UiStatusBadge>
              </div>
            </div>
          </div>

          <!-- Delivery instructions (cart-level note) -->
          <div v-if="order.delivery_instructions" class="mt-4 bg-info/10 border border-info/20 rounded-lg p-3 flex items-start gap-2">
            <svg class="w-4 h-4 text-info mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p class="text-xs font-semibold text-info uppercase tracking-wide mb-0.5">{{ t('despacho.detail.deliveryInstructions') }}</p>
              <p class="text-sm text-text-primary">{{ order.delivery_instructions }}</p>
            </div>
          </div>
        </template>

        <!-- Pickup -->
        <template v-else-if="order.order_type === 'pickup'">
          <h3 class="text-base sm:text-lg font-semibold text-text-primary flex items-center gap-2 mb-4">
            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>{{ t('despacho.detail.pickupInStore') }}</span>
          </h3>

          <!-- Notes -->
          <div v-if="order.delivery_instructions" class="mt-4 bg-info/10 border border-info/20 rounded-lg p-3 flex items-start gap-2">
            <svg class="w-4 h-4 text-info mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p class="text-xs font-semibold text-info uppercase tracking-wide mb-0.5">{{ t('despacho.detail.notes') }}</p>
              <p class="text-sm text-text-primary">{{ order.delivery_instructions }}</p>
            </div>
          </div>
        </template>

        <!-- Dine-in -->
        <template v-else>
          <h3 class="text-base sm:text-lg font-semibold text-text-primary flex items-center gap-2 mb-3">
            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>{{ t('despacho.orderTypes.dineIn') }}</span>
          </h3>
          <div class="flex items-center gap-3">
            <svg class="w-4 h-4 text-text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-sm text-text-secondary">{{ t('despacho.detail.servedInStore') }}</span>
          </div>
        </template>

        <!-- Scheduled time (all order types) -->
        <div class="flex items-start gap-3 mt-3">
          <svg class="w-4 h-4 text-text-secondary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p class="text-xs text-text-secondary mb-0.5">{{ t('despacho.detail.scheduledTime') }}</p>
            <p v-if="order.scheduled_time" class="text-sm font-medium text-text-primary">
              {{ formatDateTime(order.scheduled_time) }}
            </p>
            <div v-else class="flex items-center gap-2 mt-0.5">
              <span class="text-sm text-text-secondary">{{ t('despacho.detail.noScheduledTime') }}</span>
              <UiStatusBadge variant="success" size="sm" format="text">{{ t('despacho.common.immediate') }}</UiStatusBadge>
            </div>
          </div>
        </div>

      </div>

      <!-- ── Section 4: Status History ── -->
      <DomiciliosOnlineOrderStatusTimeline
        :history="statusHistory"
        :is-loading="isHistoryLoading"
        :error="historyError"
        :order-type="order.order_type"
      />

    </div>

    <!-- Payment capture modal (warocol.com#606) — opens on "Marcar como entregado" -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="paymentModal.open"
          class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 sm:p-6 bg-overlay-backdrop/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-modal-title"
          @click.self="closePaymentModal"
          @keydown.esc="closePaymentModal"
        >
          <Transition
            enter-active-class="transition-all duration-200"
            enter-from-class="opacity-0 translate-y-full sm:translate-y-0 sm:scale-95"
            enter-to-class="opacity-100 translate-y-0 sm:scale-100"
            leave-active-class="transition-all duration-200"
            leave-from-class="opacity-100 translate-y-0 sm:scale-100"
            leave-to-class="opacity-0 translate-y-full sm:translate-y-0 sm:scale-95"
          >
            <div
              v-if="paymentModal.open"
              class="relative bg-surface rounded-t-2xl sm:rounded-2xl shadow-xl border border-border w-full max-w-lg max-h-[90vh] flex flex-col"
              @click.stop
            >
              <!-- Header -->
              <div class="flex-shrink-0 px-6 py-4 border-b border-border flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <h3 id="payment-modal-title" class="text-xl font-bold text-text-primary">{{ t('despacho.detail.howDidCustomerPay') }}</h3>
                  <p class="text-sm text-text-secondary mt-1">
                    {{ t('despacho.common.total') }}: <span class="font-semibold text-text-primary">{{ formatCurrency(order?.total_amount ?? 0) }}</span>
                  </p>
                </div>
                <button
                  type="button"
                  :disabled="isStatusUpdating"
                  :aria-label="t('common.close')"
                  class="flex-shrink-0 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30 disabled:opacity-50 transition-colors"
                  @click="closePaymentModal"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <!-- Body -->
              <div class="flex-1 overflow-y-auto px-6 py-5">
                <PaymentsPaymentMethodSelector
                  v-model="paymentSelection"
                  :groups="(paymentGroups as any)"
                  :disabled="isStatusUpdating"
                />

                <p v-if="paymentSubmitError" role="alert" class="mt-4 text-sm text-destructive">
                  {{ paymentSubmitError }}
                </p>
              </div>

              <!-- Footer -->
              <div class="flex-shrink-0 px-6 py-4 border-t border-border bg-surface flex flex-col-reverse sm:flex-row gap-2">
                <button
                  type="button"
                  :disabled="isStatusUpdating"
                  class="flex-1 min-h-[44px] py-3 px-4 border-2 border-border rounded-lg text-text-primary font-medium hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  @click="closePaymentModal"
                >
                  {{ t('common.cancel') }}
                </button>
                <button
                  type="button"
                  :disabled="!canConfirmDelivered || isStatusUpdating"
                  class="flex-1 min-h-[44px] py-3 px-4 bg-action-primary-bg text-action-primary-text rounded-lg font-semibold hover:bg-action-primary-hover-bg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  @click="confirmDelivered"
                >
                  <UiLoadingDots v-if="isStatusUpdating" size="8px" color="currentColor" />
                  <span>{{ isStatusUpdating ? t('despacho.detail.saving') : t('despacho.detail.markDelivered') }}</span>
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <PosComandaPrintTickets
      :comandas="comandaPrintPayload"
      :business-name="businessName"
    />
  </div>
</template>
