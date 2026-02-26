<script setup lang="ts">
import { inject, watch, onMounted, onUnmounted } from 'vue'

definePageMeta({ layout: 'dashboard', ssr: false })
useHead({ title: 'Detalle Pedido — WARO' })

const route = useRoute()
const router = useRouter()
const orderId = route.params.id as string
const { formatDate, formatDateTime, formatCurrency } = useFormatters()

const { data: orderResponse, pending: isLoading, error: fetchError, refresh: refreshOrder } =
  useFetch(() => `/api/online/orders/${orderId}`, { server: false })

const order = computed(() => (orderResponse.value as any)?.data ?? null)

const { data: historyResponse, pending: isHistoryLoading, error: historyError, refresh: refreshHistory } =
  useFetch(() => `/api/online/orders/${orderId}/status-history`, { server: false })

const statusHistory = computed(() => (historyResponse.value as any)?.data ?? [])

const isStatusUpdating = ref(false)
const statusUpdateError = ref<string | null>(null)

const updateStatus = async (newStatus: string, extra: Record<string, unknown> = {}) => {
  if (!order.value || isStatusUpdating.value) return
  isStatusUpdating.value = true
  statusUpdateError.value = null
  try {
    await $fetch(`/api/online/orders/${orderId}/status`, {
      method: 'PATCH',
      body: { new_status: newStatus, ...extra },
    })
    await refreshOrder()
    await refreshHistory()
  } catch (err: any) {
    statusUpdateError.value = err?.data?.detail ?? err?.message ?? 'Error al actualizar el estado'
  } finally {
    isStatusUpdating.value = false
  }
}

const confirmOrder = () => updateStatus('confirmed', { auto_complete: true })

const ORDER_TYPE_LABELS: Record<string, string> = {
  delivery: 'Domicilio',
  pickup: 'Recogida',
  'dine-in': 'En mesa',
}

const { getStatusText, getStatusVariant } = useOnlineOrderStatus()

const goBack = () => router.push('/domicilios/pedidos')

// Dashboard layout inject — dynamic title / subtitle / back button
const setPageTitle      = inject<(title: string | undefined) => void>('setPageTitle')
const setPageSubtitle   = inject<(subtitle: string | undefined) => void>('setPageSubtitle')
const setShowBackButton = inject<(show: boolean) => void>('setShowBackButton')
const setBackHandler    = inject<(handler: (() => void) | undefined) => void>('setBackHandler')

watch(order, (newOrder) => {
  if (newOrder) {
    setPageTitle?.(`Pedido #${newOrder.order_number}`)
    setPageSubtitle?.(formatDate(newOrder.order_date))
  }
}, { immediate: true })

onMounted(() => {
  setShowBackButton?.(true)
  setBackHandler?.(goBack)
})

onUnmounted(() => {
  setPageTitle?.(undefined)
  setPageSubtitle?.(undefined)
  setShowBackButton?.(false)
  setBackHandler?.(undefined)
})
</script>

<template>
  <div class="page-layout">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="fetchError" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <p class="text-xl font-semibold text-text-primary mb-2">Error al cargar el pedido.</p>
        <p class="text-sm text-text-secondary mb-4">{{ fetchError.message }}</p>
        <NuxtLink
          to="/domicilios/pedidos"
          class="min-h-[44px] px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center"
        >
          Volver al Listado
        </NuxtLink>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else-if="order" class="space-y-6">

      <!-- ── Section 1: Info Cards ── -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Card 1: Cliente -->
        <div class="bg-surface border border-border rounded-xl p-4">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Cliente</p>
          <p class="text-lg font-bold text-text-primary truncate">{{ order.verified_email ?? '—' }}</p>
          <UiStatusBadge variant="info" format="text" class="mt-1 border-0" size="sm">
            {{ ORDER_TYPE_LABELS[order.order_type] ?? order.order_type }}
          </UiStatusBadge>
        </div>

        <!-- Card 2: Pedido -->
        <div class="bg-surface border border-border rounded-xl p-4">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Pedido</p>
          <p class="text-lg font-bold text-text-primary">#{{ order.order_number }}</p>
          <p class="text-sm text-text-secondary mt-1">{{ formatDate(order.order_date) }}</p>
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
            {{ getStatusText(order.status) }}
          </UiStatusBadge>
        </div>

        <!-- Card 4: Total (primary accent) -->
        <div class="bg-surface border-2 border-primary rounded-xl p-4">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Total</p>
          <p class="text-2xl font-bold text-primary">{{ formatCurrency(order.total_amount) }}</p>
        </div>
      </div>

      <!-- ── Section 1.5: Status Actions ── -->
      <div class="bg-surface border border-border rounded-xl p-4 sm:p-6">
        <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">Acciones del pedido</p>

        <!-- Terminal states -->
        <div v-if="order.status === 'completed'" class="flex items-center gap-3">
          <span class="text-sm text-text-secondary">Pedido completado. No hay más acciones disponibles.</span>
        </div>
        <div v-else-if="order.status === 'cancelled'" class="flex items-center gap-3">
          <span class="text-sm text-text-secondary">Pedido cancelado. No hay más acciones disponibles.</span>
        </div>

        <!-- Active states -->
        <div v-else class="flex flex-col sm:flex-row gap-3">
          <UiButton v-if="order.status === 'pending'" size="lg" :disabled="isStatusUpdating" @click="confirmOrder()">
            {{ isStatusUpdating ? 'Confirmando...' : 'Confirmar pedido' }}
          </UiButton>
          <UiButton v-else-if="order.status === 'confirmed'" size="lg" :disabled="isStatusUpdating" @click="updateStatus('preparing')">
            {{ isStatusUpdating ? 'Actualizando...' : 'Marcar en preparación' }}
          </UiButton>
          <UiButton v-else-if="order.status === 'preparing'" size="lg" :disabled="isStatusUpdating" @click="updateStatus('delivered')">
            {{ isStatusUpdating ? 'Actualizando...' : 'Marcar como entregado' }}
          </UiButton>
          <UiButton v-else-if="order.status === 'delivered'" size="lg" :disabled="isStatusUpdating" @click="updateStatus('completed')">
            {{ isStatusUpdating ? 'Completando...' : 'Completar pedido' }}
          </UiButton>

          <UiButton
            v-if="['pending', 'confirmed', 'preparing'].includes(order.status)"
            variant="destructive"
            size="lg"
            :disabled="isStatusUpdating"
            @click="updateStatus('cancelled')"
          >
            {{ isStatusUpdating ? 'Cancelando...' : 'Cancelar pedido' }}
          </UiButton>
        </div>

        <p v-if="statusUpdateError" role="alert" class="mt-3 text-sm text-destructive">{{ statusUpdateError }}</p>
      </div>

      <!-- ── Section 2: Items ── -->
      <div class="bg-surface border border-border rounded-xl overflow-hidden">
        <div class="p-6 border-b border-border">
          <h2 class="text-lg font-semibold text-text-primary">Items de la Orden ({{ order.items.length }})</h2>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full">
            <caption class="sr-only">Items de la orden</caption>
            <thead class="bg-surface-secondary">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider">Producto</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-text-primary uppercase tracking-wider">Cant.</th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-text-primary uppercase tracking-wider">Precio</th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-text-primary uppercase tracking-wider">Subtotal</th>
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
                      <span class="text-sm font-semibold text-text-primary">{{ item.product_name }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {{ item.quantity % 1 === 0 ? item.quantity.toFixed(0) : item.quantity }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <span class="text-sm font-medium text-text-primary">{{ formatCurrency(item.unit_price) }}</span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <span class="text-sm font-bold text-primary">{{ formatCurrency(item.subtotal) }}</span>
                  </td>
                </tr>

                <!-- Modifier Rows -->
                <tr
                  v-for="mod in item.modifiers"
                  :key="`mod-${mod.name}`"
                  class="bg-surface-secondary/30"
                >
                  <td class="px-6 py-2 pl-14">
                    <div class="flex items-center gap-2">
                      <span class="text-primary text-xs">+</span>
                      <span class="text-xs text-text-secondary">{{ mod.name }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-2 text-center">
                    <span class="text-xs text-text-tertiary">x{{ item.quantity }}</span>
                  </td>
                  <td class="px-6 py-2 text-right">
                    <span class="text-xs text-text-secondary">{{ formatCurrency(mod.price) }}</span>
                  </td>
                  <td class="px-6 py-2 text-right">
                    <span class="text-xs text-primary/70">{{ formatCurrency(mod.price * item.quantity) }}</span>
                  </td>
                </tr>
              </template>
            </tbody>
            <tfoot class="bg-surface-secondary border-t-2 border-border">
              <tr>
                <td colspan="3" class="px-6 py-4 text-right text-sm font-semibold text-text-primary">
                  Total del pedido:
                </td>
                <td class="px-6 py-4 text-right">
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
            <span>Dirección de entrega</span>
          </h3>

          <div v-if="order.delivery_address" class="space-y-3">
            <!-- Street -->
            <div class="flex items-start gap-3">
              <svg class="w-4 h-4 text-text-secondary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <div>
                <p class="text-xs text-text-secondary mb-0.5">Dirección</p>
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
              <p class="text-xs font-semibold text-info uppercase tracking-wide mb-0.5">Instrucciones de entrega</p>
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
            <span>Recogida en tienda</span>
          </h3>

          <!-- Notes -->
          <div v-if="order.delivery_instructions" class="mt-4 bg-info/10 border border-info/20 rounded-lg p-3 flex items-start gap-2">
            <svg class="w-4 h-4 text-info mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p class="text-xs font-semibold text-info uppercase tracking-wide mb-0.5">Notas</p>
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
            <span>En mesa</span>
          </h3>
          <div class="flex items-center gap-3">
            <svg class="w-4 h-4 text-text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-sm text-text-secondary">Pedido servido en el local</span>
          </div>
        </template>

        <!-- Scheduled time (all order types) -->
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

      <!-- ── Section 4: Status History ── -->
      <DomiciliosOnlineOrderStatusTimeline
        :history="statusHistory"
        :is-loading="isHistoryLoading"
        :error="historyError"
      />

    </div>
  </div>
</template>
