<script setup lang="ts">
import { inject, watch, onMounted, onUnmounted } from 'vue'

definePageMeta({ layout: 'dashboard', ssr: false })
useHead({ title: 'Detalle Pedido — WARO' })

const route = useRoute()
const router = useRouter()
const orderId = route.params.id as string
const { formatDate, formatDateTime, formatCurrency } = useFormatters()

const { data: orderResponse, pending: isLoading, error: fetchError } =
  useFetch(() => `/api/online/orders/${orderId}`, { server: false })

const order = computed(() => (orderResponse.value as any)?.data ?? null)

const ORDER_TYPE_LABELS: Record<string, string> = {
  delivery: 'Domicilio',
  pickup: 'Recogida',
  'dine-in': 'En mesa',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  delivered: 'Entregado',
  completed: 'Completado',
  cancelled: 'Cancelado',
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    delivered: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    pending:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    confirmed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    preparing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

const goBack = () => router.push('/domicilios/pedidos')

// Dashboard layout inject — dynamic title / status / back button
const setPageTitle    = inject<(title: string | undefined) => void>('setPageTitle')
const setPageSubtitle = inject<(subtitle: string | undefined) => void>('setPageSubtitle')
const setPageStatus   = inject<(status: { label: string; color: string } | undefined) => void>('setPageStatus')
const setShowBackButton = inject<(show: boolean) => void>('setShowBackButton')
const setBackHandler  = inject<(handler: (() => void) | undefined) => void>('setBackHandler')

watch(order, (newOrder) => {
  if (newOrder) {
    setPageTitle?.(`Pedido #${newOrder.order_number}`)
    setPageSubtitle?.(formatDate(newOrder.order_date))
    setPageStatus?.({
      label: STATUS_LABELS[newOrder.status] ?? newOrder.status,
      color: getStatusColor(newOrder.status),
    })
  }
}, { immediate: true })

onMounted(() => {
  setShowBackButton?.(true)
  setBackHandler?.(goBack)
})

onUnmounted(() => {
  setPageTitle?.(undefined)
  setPageSubtitle?.(undefined)
  setPageStatus?.(undefined)
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
        </div>

        <!-- Card 3: Estado (info accent) -->
        <div class="bg-surface border-2 border-info rounded-xl p-4">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Estado</p>
          <p class="text-lg font-bold text-info">{{ STATUS_LABELS[order.status] ?? order.status }}</p>
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
          <h2 class="text-lg font-semibold text-text-primary">Items de la Orden ({{ order.items.length }})</h2>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full">
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
                      <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-lg flex-shrink-0">
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
      <div class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6">
        <!-- Delivery -->
        <template v-if="order.order_type === 'delivery'">
          <h3 class="text-base sm:text-lg font-semibold text-text-primary flex items-center space-x-2 mb-4">
            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Dirección de entrega</span>
          </h3>
          <div v-if="order.delivery_address" class="space-y-1 text-sm text-text-primary">
            <p class="font-medium">
              {{ order.delivery_address.address_line1 }}
              <span v-if="order.delivery_address.address_line2">, {{ order.delivery_address.address_line2 }}</span>
            </p>
            <p class="text-text-secondary">{{ order.delivery_address.city }}</p>
            <p v-if="order.delivery_address.delivery_notes" class="text-text-secondary italic">
              {{ order.delivery_address.delivery_notes }}
            </p>
            <p v-if="order.delivery_address.label" class="text-xs text-text-secondary/70">
              {{ order.delivery_address.label }}
            </p>
          </div>
          <div
            v-if="order.delivery_instructions"
            class="mt-3 pt-3 border-t border-border"
          >
            <p class="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Instrucciones de entrega</p>
            <p class="text-sm text-text-primary">{{ order.delivery_instructions }}</p>
          </div>
        </template>

        <!-- Pickup -->
        <template v-else-if="order.order_type === 'pickup'">
          <h3 class="text-base sm:text-lg font-semibold text-text-primary flex items-center space-x-2 mb-3">
            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>Recogida en tienda</span>
          </h3>
          <p v-if="order.scheduled_time" class="text-sm text-text-secondary">
            Hora de recogida: <span class="font-medium text-text-primary">{{ formatDateTime(order.scheduled_time) }}</span>
          </p>
          <p v-else class="text-sm text-text-secondary">Sin hora programada — entrega inmediata</p>
          <div v-if="order.delivery_instructions" class="mt-3 pt-3 border-t border-border">
            <p class="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Notas</p>
            <p class="text-sm text-text-primary">{{ order.delivery_instructions }}</p>
          </div>
        </template>

        <!-- Dine-in -->
        <template v-else>
          <h3 class="text-base sm:text-lg font-semibold text-text-primary flex items-center space-x-2">
            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>En mesa</span>
          </h3>
        </template>
      </div>

    </div>
  </div>
</template>
