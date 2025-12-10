<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({
  layout: 'dashboard',
  ssr: false
})

// Tenant reactivity
const { onTenantChange, currentTenant } = useTenantReactive()

const route = useRoute()
const router = useRouter()

const orderId = computed(() => route.params.id as string)

// Load order details
const { data: orderData, pending: isLoading, error: fetchError, refresh: refreshOrder } = useAsyncData(
  `order-${orderId.value}-${currentTenant.value?.id || 'default'}`,
  async () => {
    const response = await $fetch(`/api/orders/${orderId.value}`) as any
    return response.data
  },
  {
    server: false,
    watch: [currentTenant]
  }
)

// Load order items
const { data: itemsData, pending: itemsLoading, refresh: refreshItems } = useAsyncData(
  `order-items-${orderId.value}-${currentTenant.value?.id || 'default'}`,
  async () => {
    const response = await $fetch(`/api/orders/${orderId.value}/items`) as any
    return response.data
  },
  {
    server: false,
    watch: [currentTenant]
  }
)

// Refresh on tenant change
onTenantChange(async () => {
  await Promise.all([refreshOrder(), refreshItems()])
})

const order = computed(() => {
  if (!orderData.value) return null

  return {
    ...orderData.value,
    customer_name: orderData.value.customer?.name || 'Sin nombre',
    customer_phone: orderData.value.customer?.phone || 'N/A'
  }
})

const items = computed(() => itemsData.value || [])

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const getPaymentMethodLabel = (method: string) => {
  const labels: Record<string, string> = {
    'cash': 'Efectivo',
    'card': 'Tarjeta',
    'digital': 'Pago Digital'
  }
  return labels[method] || method
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'completed': 'Completada',
    'cancelled': 'Cancelada',
    'pending': 'Pendiente'
  }
  return labels[status] || status
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'completed': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

const goBack = () => {
  router.push('/ventas')
}

const printReceipt = () => {
  // TODO: Implementar funcionalidad de impresión
  window.print()
}

// Get layout setters
const setPageTitle = inject<(title: string | undefined) => void>('setPageTitle')
const setPageSubtitle = inject<(subtitle: string | undefined) => void>('setPageSubtitle')
const setPageStatus = inject<(status: { label: string; color: string } | undefined) => void>('setPageStatus')
const setShowBackButton = inject<(show: boolean) => void>('setShowBackButton')
const setBackHandler = inject<(handler: (() => void) | undefined) => void>('setBackHandler')
const setHeaderAction = inject<(action: { label: string; icon?: boolean; handler: () => void } | undefined) => void>('setHeaderAction')

// Watch order data and update layout header
watch(order, (newOrder) => {
  if (newOrder) {
    setPageTitle?.(`Orden #${newOrder.order_number}`)
    setPageSubtitle?.(formatDate(newOrder.order_date))
    setPageStatus?.({
      label: getStatusLabel(newOrder.status),
      color: getStatusColor(newOrder.status)
    })
  }
}, { immediate: true })

// Set back button and print action
onMounted(() => {
  setShowBackButton?.(true)
  setBackHandler?.(goBack)
  setHeaderAction?.({
    label: 'Imprimir',
    icon: true,
    handler: printReceipt
  })
})

// Clean up on unmount
onUnmounted(() => {
  setPageTitle?.(undefined)
  setPageSubtitle?.(undefined)
  setPageStatus?.(undefined)
  setShowBackButton?.(false)
  setBackHandler?.(undefined)
  setHeaderAction?.(undefined)
})
</script>

<template>
  <div class="page-layout">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="fetchError || !order" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <p class="text-xl font-semibold text-text-primary mb-2">Orden no encontrada</p>
        <p class="text-sm text-text-secondary mb-6">{{ fetchError?.message || 'La orden que buscas no existe' }}</p>
        <button @click="goBack" class="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
          Volver a Ventas
        </button>
      </div>
    </div>

    <!-- Order Details -->
    <div v-else class="space-y-6">
      <!-- Order Info Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Customer Name -->
        <div class="bg-surface border border-border rounded-xl p-4">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Cliente</p>
          <p class="text-lg font-bold text-text-primary">{{ order.customer_name }}</p>
        </div>

        <!-- Customer Phone -->
        <div class="bg-surface border border-border rounded-xl p-4">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Teléfono</p>
          <p class="text-lg font-bold text-text-primary">{{ order.customer_phone }}</p>
        </div>

        <!-- Payment Method -->
        <div class="bg-surface border-2 border-info rounded-xl p-4">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Método de Pago</p>
          <p class="text-lg font-bold text-info">{{ getPaymentMethodLabel(order.payment_method) }}</p>
        </div>

        <!-- Total Amount -->
        <div class="bg-surface border-2 border-primary rounded-xl p-4">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Total</p>
          <p class="text-2xl font-bold text-primary">{{ formatCurrency(order.total_amount) }}</p>
        </div>
      </div>

      <!-- Order Items -->
      <div class="bg-surface border border-border rounded-xl overflow-hidden">
        <div class="p-6 border-b border-border">
          <h2 class="text-lg font-semibold text-text-primary">Items de la Orden ({{ order.items_count }})</h2>
        </div>

        <!-- Loading Items -->
        <div v-if="itemsLoading" class="flex items-center justify-center py-12">
          <CommonsTheCustomLoader size="medium" />
        </div>

        <!-- Items Table -->
        <div v-else-if="items.length > 0" class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-surface-secondary">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider">Producto</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider">Modificadores</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-text-primary uppercase tracking-wider">Cantidad</th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-text-primary uppercase tracking-wider">Precio Unit.</th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-text-primary uppercase tracking-wider">Subtotal</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="item in items"
                :key="item.id"
                class="hover:bg-surface-secondary/50 transition-colors"
              >
                <!-- Product -->
                <td class="px-6 py-4">
                  <div>
                    <p class="text-sm font-medium text-text-primary">{{ item.product.name }}</p>
                    <p v-if="item.product.description" class="text-xs text-text-secondary mt-1">{{ item.product.description }}</p>
                  </div>
                </td>

                <!-- Modifiers -->
                <td class="px-6 py-4">
                  <div v-if="item.modifiers && item.modifiers.length > 0" class="space-y-1">
                    <div
                      v-for="modifier in item.modifiers"
                      :key="modifier.id"
                      class="text-xs text-text-secondary"
                    >
                      • {{ modifier.name }}
                      <span v-if="modifier.price > 0" class="text-primary">+{{ formatCurrency(modifier.price) }}</span>
                    </div>
                  </div>
                  <span v-else class="text-xs text-text-secondary">-</span>
                </td>

                <!-- Quantity -->
                <td class="px-6 py-4 text-center">
                  <span class="text-sm font-medium text-text-primary">{{ item.quantity }}</span>
                </td>

                <!-- Unit Price -->
                <td class="px-6 py-4 text-right">
                  <span class="text-sm text-text-primary">{{ formatCurrency(item.price_at_purchase) }}</span>
                </td>

                <!-- Subtotal -->
                <td class="px-6 py-4 text-right">
                  <span class="text-sm font-bold text-primary">{{ formatCurrency(item.subtotal) }}</span>
                </td>
              </tr>
            </tbody>
            <tfoot class="bg-surface-secondary">
              <tr>
                <td colspan="4" class="px-6 py-4 text-right text-sm font-semibold text-text-primary">
                  Total de la Orden:
                </td>
                <td class="px-6 py-4 text-right">
                  <span class="text-lg font-bold text-primary">{{ formatCurrency(order.total_amount) }}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-12">
          <p class="text-sm text-text-secondary">No hay items en esta orden</p>
        </div>
      </div>

    </div>
  </div>
</template>
