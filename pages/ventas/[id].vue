<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFormatters } from '~/composables/useFormatters'

definePageMeta({
  layout: 'dashboard'
})

useHead({ title: 'Detalle de Venta' })

// Tenant reactivity
const { currentTenant } = useTenantReactive()

// Payment groups for label resolution and method buttons
const { data: paymentGroupsData } = useQuery({
  key: () => ['payments', 'groups', currentTenant.value?.id ?? null],
  query: () => $fetch<{ success: boolean; data: { id: string; slug: string; name: string; methods: { id: string; name: string }[] }[] }>('/api/pos/payment-methods'),
  enabled: () => !!currentTenant.value,
  staleTime: 300_000,
})
const paymentGroups = computed(() => paymentGroupsData.value?.data ?? [])
const { resolveLabel } = usePaymentLabel(paymentGroups)

const route = useRoute()
const router = useRouter()

const orderId = computed(() => route.params.id as string)

// Split payments slide-over
const showSplitPaymentsPanel = ref(false)

// Edit mode state
const isEditMode = ref(false)
const isSaving = ref(false)
const itemsToDelete = ref<Set<string>>(new Set())
const modifiersToDelete = ref<Map<string, Set<string>>>(new Map())

// Status update (mesa orders)
const isUpdatingStatus = ref(false)
const selectedNewStatus = ref('')
const selectedPaymentMethod = ref('')

// Load order details
const { data: orderData, status: orderStatus, asyncStatus: orderAsyncStatus, error: fetchError, refetch: refetchOrder } = useQuery({
  key: () => ['orders', currentTenant.value?.id ?? null, orderId.value],
  query: async () => {
    const response = await $fetch(`/api/orders/${orderId.value}`) as any
    return response.data
  },
  enabled: () => !!currentTenant.value && !!orderId.value,
  staleTime: 60_000,
})

// Load order items
const { data: itemsData, status: itemsStatus, asyncStatus: itemsAsyncStatus, refetch: refetchItems } = useQuery({
  key: () => ['orders', currentTenant.value?.id ?? null, orderId.value, 'items'],
  query: async () => {
    const response = await $fetch(`/api/orders/${orderId.value}/items`) as any
    return response.data
  },
  enabled: () => !!currentTenant.value && !!orderId.value,
  staleTime: 60_000,
})

// Load invoice for this order (404 = no invoice, not an error)
const { data: invoiceData, refetch: refetchInvoice } = useQuery({
  key: () => ['order-invoice', currentTenant.value?.id ?? null, orderId.value],
  query: async () => {
    try {
      return await $fetch(`/api/orders/${orderId.value}/invoice`) as any
    } catch (e: any) {
      if (e.status === 404 || e.statusCode === 404) return null
      throw e
    }
  },
  enabled: () => !!currentTenant.value && !!orderId.value,
  staleTime: 60_000,
})

// Invoice emit state
const isEmittingInvoice = ref(false)
const emitInvoiceError = ref('')
const copiedCufe = ref(false)

const emitInvoice = async () => {
  if (isEmittingInvoice.value) return
  isEmittingInvoice.value = true
  emitInvoiceError.value = ''
  try {
    await $fetch(`/api/orders/${orderId.value}/invoice`, { method: 'POST' })
    await refetchInvoice()
  } catch (e: any) {
    emitInvoiceError.value = e.data?.detail || e.data?.message || e.message || 'Error al emitir factura'
  } finally {
    isEmittingInvoice.value = false
  }
}

const copyCufe = async (cufe: string) => {
  try {
    await navigator.clipboard.writeText(cufe)
    copiedCufe.value = true
    setTimeout(() => { copiedCufe.value = false }, 2000)
  } catch {
    // Fallback: do nothing
  }
}

const isLoading = computed(() => !orderData.value && !fetchError.value)
const itemsLoading = computed(() => !itemsData.value)
const isRefreshing = computed(() =>
  (orderAsyncStatus.value === 'loading' && orderData.value != null) ||
  (itemsAsyncStatus.value === 'loading' && itemsData.value != null)
)
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
const handleRefresh = async () => {
  await Promise.all([refetchOrder(), refetchItems(), refetchInvoice()])
}
registerProgressiveLoading(isRefreshing)

const order = computed(() => {
  if (!orderData.value) return null

  return {
    ...orderData.value,
    customer_name: orderData.value.customer?.name || 'Sin nombre',
    customer_phone: orderData.value.customer?.phone || 'N/A'
  }
})

const items = computed(() => itemsData.value || [])

// Filtered items (excluding deleted ones in edit mode)
const visibleItems = computed(() => {
  if (!isEditMode.value) return items.value
  return items.value.filter((item: any) => !itemsToDelete.value.has(item.id))
})

// Calculate adjusted total
const adjustedTotal = computed(() => {
  let total = 0
  for (const item of visibleItems.value) {
    let itemTotal = Number(item.price_at_purchase) * Number(item.quantity)

    // Add modifiers that aren't deleted
    const deletedMods = modifiersToDelete.value.get(item.id) || new Set()
    for (const mod of (item.modifiers || [])) {
      if (!deletedMods.has(mod.id)) {
        itemTotal += Number(mod.price) * Number(item.quantity)
      }
    }
    total += itemTotal
  }
  return total
})

// Gross subtotal (before discount) — sum of all item subtotals
const grossSubtotal = computed(() => items.value.reduce((sum: number, item: any) => sum + Number(item.subtotal), 0))

// Check if there are changes
const hasChanges = computed(() => {
  return itemsToDelete.value.size > 0 ||
    Array.from(modifiersToDelete.value.values()).some(set => set.size > 0)
})

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

const { formatDateTime: formatDate } = useFormatters()


// ── Credit panel state ──────────────────────────────────────────────────────

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
    'completed': 'bg-primary/10 text-primary',
    'cancelled': 'bg-status-critical-bg text-status-critical-text',
    'pending': 'bg-status-warning-bg text-status-warning-text'
  }
  return colors[status] || 'bg-secondary text-secondary-foreground'
}

const goBack = () => {
  router.push('/ventas')
}

const printReceipt = () => {
  window.print()
}

// Edit mode functions
const enterEditMode = () => {
  isEditMode.value = true
  itemsToDelete.value = new Set()
  modifiersToDelete.value = new Map()
}

const cancelEdit = () => {
  isEditMode.value = false
  itemsToDelete.value = new Set()
  modifiersToDelete.value = new Map()
}

const markItemForDeletion = (itemId: string) => {
  // Check if this would delete all items
  const remainingItems = items.value.filter((item: any) =>
    !itemsToDelete.value.has(item.id) && item.id !== itemId
  )

  if (remainingItems.length === 0) {
    useToast().error('La venta debe tener al menos un producto', { title: 'No permitido' })
    return
  }

  const newSet = new Set(itemsToDelete.value)
  newSet.add(itemId)
  itemsToDelete.value = newSet
}

const markModifierForDeletion = (itemId: string, modifierId: string) => {
  const newMap = new Map(modifiersToDelete.value)
  if (!newMap.has(itemId)) {
    newMap.set(itemId, new Set())
  }
  const modSet = new Set(newMap.get(itemId))
  modSet.add(modifierId)
  newMap.set(itemId, modSet)
  modifiersToDelete.value = newMap
}

const isModifierDeleted = (itemId: string, modifierId: string) => {
  return modifiersToDelete.value.get(itemId)?.has(modifierId) || false
}

const updateStatus = async () => {
  if (!selectedNewStatus.value) return
  isUpdatingStatus.value = true
  try {
    await $fetch(`/api/orders/${orderId.value}/status`, {
      method: 'PATCH',
      body: {
        status: selectedNewStatus.value,
        payment_method: selectedPaymentMethod.value || undefined,
      },
    })
    await refetchOrder()
    selectedNewStatus.value = ''
    selectedPaymentMethod.value = ''
    useToast().success('Estado actualizado correctamente', { title: 'Listo' })
  } catch (error: any) {
    useToast().error(error.data?.message || 'Error al actualizar el estado', { title: 'Error' })
  } finally {
    isUpdatingStatus.value = false
  }
}

// Save changes - backend handles inventory restock automatically
const saveChanges = async () => {
  if (!hasChanges.value) return

  isSaving.value = true
  try {
    // Delete items (backend automatically returns ingredients to stock)
    for (const itemId of itemsToDelete.value) {
      await $fetch(`/api/orders/${orderId.value}/items/${itemId}`, {
        method: 'DELETE'
      })
    }

    // Delete modifiers (backend automatically returns ingredients to stock)
    for (const [itemId, modifierIds] of modifiersToDelete.value) {
      // Skip if item was already deleted
      if (itemsToDelete.value.has(itemId)) continue

      for (const modifierId of modifierIds) {
        await $fetch(`/api/orders/${orderId.value}/items/${itemId}/modifiers/${modifierId}`, {
          method: 'DELETE'
        })
      }
    }

    // Refresh data
    await Promise.all([refetchOrder(), refetchItems()])

    isEditMode.value = false
    itemsToDelete.value = new Set()
    modifiersToDelete.value = new Map()

    useToast().success('Venta ajustada correctamente. Stock actualizado.', { title: 'Cambios guardados' })
  } catch (error: any) {
    console.error('Error saving changes:', error)
    useToast().error(error.data?.message || 'Error al guardar los cambios', { title: 'Error' })
  } finally {
    isSaving.value = false
  }
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
  setRefreshHandler(handleRefresh)
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
  clearRefreshHandler(handleRefresh)
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
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
        <component :is="order.split_payments && order.split_payments.length > 0 ? 'button' : 'div'"
          class="bg-surface border-2 border-info rounded-xl p-4 text-left w-full"
          :class="order.split_payments && order.split_payments.length > 0 ? 'hover:bg-surface-secondary/50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-info/30' : ''"
          @click="order.split_payments && order.split_payments.length > 0 ? showSplitPaymentsPanel = true : null"
          :aria-label="order.split_payments && order.split_payments.length > 0 ? 'Ver detalle de cobro dividido' : undefined">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Método de Pago</p>
          <div class="flex items-center justify-between gap-2">
            <p class="text-lg font-bold text-info leading-tight">
              <template v-if="order.split_payments && order.split_payments.length > 0">
                Cobro dividido · {{ order.split_payments.length }} pagos
              </template>
              <template v-else>
                {{ resolveLabel(order.payment_method, order.payment_method_id) }}
              </template>
            </p>
            <svg v-if="order.split_payments && order.split_payments.length > 0" class="w-4 h-4 text-info flex-shrink-0"
              fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </component>

        <!-- Source / Origin -->
        <div class="bg-surface border border-border rounded-xl p-4">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Origen</p>
          <span class="inline-flex items-center gap-1.5 text-sm font-bold px-2.5 py-1 rounded-full" :class="{
            'bg-emerald-100 text-emerald-700': order.is_delivery,
            'bg-amber-100 text-amber-700': !order.is_delivery && order.source === 'barra',
            'bg-crocus-100 text-crocus-700': !order.is_delivery && order.source === 'mesa',
            'bg-blue-100 text-blue-700': !order.is_delivery && (order.source === 'pos' || !order.source),
          }">
            <template v-if="!order.is_delivery">
              <svg v-if="order.source === 'barra'" class="w-3.5 h-3.5" fill="none" stroke="currentColor"
                viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21a48.25 48.25 0 0 1-8.135-.687c-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
              <svg v-else-if="order.source === 'mesa'" class="w-3.5 h-3.5" fill="none" stroke="currentColor"
                viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 10h18M3 14h18M10 10V6m4 4V6m-9 8v4m14-4v4M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
              </svg>
              <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </template>
            {{ order.is_delivery ? 'Domicilio' : order.source === 'barra' ? 'Barra' : order.source === 'mesa' ? 'Mesa' : 'POS' }}
          </span>
        </div>

        <!-- Total Amount -->
        <div class="bg-surface border-2 border-primary rounded-xl p-4">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Total</p>
          <!-- Discount indicator: crossed-out gross + badge -->
          <div v-if="order.discount_amount > 0 && !isEditMode" class="flex items-center gap-2 mb-1">
            <span class="text-sm text-text-tertiary line-through tabular-nums">{{ formatCurrency(grossSubtotal)
            }}</span>
            <span class="text-xs font-bold bg-destructive/10 text-destructive rounded-full px-2 py-0.5 leading-tight">
              {{ order.discount_type === 'percent' ? `-${order.discount_value}%` : 'Descuento' }}
            </span>
          </div>
          <p class="text-2xl font-bold text-primary tabular-nums">
            {{ isEditMode && hasChanges ? formatCurrency(adjustedTotal) : formatCurrency(order.total_amount) }}
          </p>
          <p v-if="isEditMode && hasChanges" class="text-xs text-text-tertiary line-through">
            {{ formatCurrency(order.total_amount) }}
          </p>
        </div>
      </div>

      <!-- Delivery Info Section (only for delivery orders) -->
      <div v-if="order.is_delivery" class="bg-surface border border-border rounded-2xl overflow-hidden">
        <!-- Header -->
        <div class="px-5 py-4 border-b border-border">
          <h2 class="text-base sm:text-lg font-bold text-text-primary">Información de entrega</h2>
        </div>

        <!-- Body — 2 column grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
          <!-- Address column -->
          <div class="px-5 py-5">
            <p class="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Dirección</p>
            <template v-if="order.delivery_address">
              <p class="text-base font-semibold text-text-primary leading-snug">
                {{ order.delivery_address.address_line1 }}
              </p>
              <p v-if="order.delivery_address.address_line2" class="text-sm text-text-secondary leading-snug mt-0.5">
                {{ order.delivery_address.address_line2 }}
              </p>
              <p class="text-sm text-text-secondary leading-snug mt-0.5">
                {{ order.delivery_address.city }}<span v-if="order.delivery_address.state">, {{ order.delivery_address.state }}</span>
              </p>
              <div v-if="order.delivery_address.delivery_notes"
                class="mt-3 px-3 py-2 rounded-lg bg-surface-secondary border-l-2 border-emerald-400">
                <p class="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">Notas de la dirección</p>
                <p class="text-sm text-text-primary leading-relaxed">{{ order.delivery_address.delivery_notes }}</p>
              </div>
              <a v-if="order.delivery_address.latitude && order.delivery_address.longitude"
                 :href="`https://www.google.com/maps/?q=${order.delivery_address.latitude},${order.delivery_address.longitude}`"
                 target="_blank" rel="noopener"
                 class="inline-flex items-center gap-1.5 mt-4 min-h-[44px] py-2 px-3 -mx-3 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Ver en mapa
              </a>
            </template>
            <p v-else class="text-sm text-text-tertiary italic flex items-center gap-2">
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
              </svg>
              Dirección eliminada
            </p>
          </div>

          <!-- Schedule + instructions column -->
          <div class="px-5 py-5">
            <p class="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Hora de entrega</p>
            <p class="text-base font-semibold text-text-primary leading-snug">
              {{ order.scheduled_time ? formatDate(order.scheduled_time) : 'Inmediato' }}
            </p>
            <p v-if="!order.scheduled_time" class="text-xs text-text-secondary mt-0.5">Apenas se cobre, listo para despachar</p>

            <template v-if="order.delivery_instructions">
              <p class="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 mt-5">Notas para el repartidor</p>
              <div class="px-3 py-2 rounded-lg bg-surface-secondary border-l-2 border-emerald-400">
                <p class="text-sm text-text-primary leading-relaxed">{{ order.delivery_instructions }}</p>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Electronic Invoice Section -->
      <div class="bg-surface border border-border rounded-2xl overflow-hidden">
        <!-- Invoice exists -->
        <template v-if="invoiceData">
          <!-- Header -->
          <div class="flex items-center justify-between gap-4 px-5 py-4 border-b border-border">
            <div class="flex items-center gap-3 min-w-0">
              <span class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"
                aria-hidden="true">
                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                  stroke-width="1.8" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </span>
              <div class="min-w-0">
                <h2 class="text-sm font-bold text-text-primary truncate">Factura Electrónica</h2>
                <p class="text-xs text-text-tertiary mt-0.5">DIAN</p>
              </div>
            </div>

            <span class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full flex-shrink-0"
              :class="{
                'bg-status-success-bg text-status-success-text': invoiceData.status === 'accepted',
                'bg-status-warning-bg text-status-warning-text': invoiceData.status === 'pending',
                'bg-status-critical-bg text-status-critical-text': invoiceData.status === 'rejected',
              }">
              <svg v-if="invoiceData.status === 'accepted'" class="w-3.5 h-3.5" fill="none" stroke="currentColor"
                viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <svg v-else-if="invoiceData.status === 'pending'" class="w-3.5 h-3.5" fill="none" stroke="currentColor"
                viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              {{ invoiceData.status === 'accepted' ? 'Aceptada' : invoiceData.status === 'pending' ? 'Pendiente' :
                'Rechazada' }}
            </span>
          </div>

          <!-- Body: 3 columns -->
          <div class="grid grid-cols-1 md:grid-cols-3 md:divide-x md:divide-border">
            <!-- Col 1: Información -->
            <div class="p-5">
              <h3 class="text-sm font-bold text-text-primary mb-4">Información</h3>
              <div class="space-y-4">
                <div>
                  <p class="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Número</p>
                  <p class="text-2xl font-extrabold text-text-primary tracking-tight tabular-nums">
                    {{ invoiceData.prefix }}-{{ invoiceData.invoice_number }}
                  </p>
                </div>
                <div v-if="invoiceData.emitted_at">
                  <p class="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Emitida</p>
                  <p class="text-sm text-text-secondary">{{ useFormatters().formatDate(invoiceData.emitted_at) }}</p>
                </div>
              </div>
            </div>

            <!-- Col 2: Descargar -->
            <div class="p-5 flex flex-col justify-start">
              <h3 class="text-sm font-bold text-text-primary mb-4">Descargar</h3>
              <div class="flex-1 flex flex-col justify-start gap-3 w-full h-fit">
                <p class="text-sm text-text-secondary">
                  Descarga tu factura electrónica en formato PDF
                </p>
                <a v-if="invoiceData.status === 'accepted' && invoiceData.pdf_presigned_url"
                  :href="invoiceData.pdf_presigned_url" target="_blank" rel="noopener"
                  class="w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-3 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                      d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Descargar PDF
                </a>
                <p v-else class="text-xs text-text-tertiary">
                  Disponible cuando la factura esté aceptada.
                </p>
              </div>
            </div>

            <!-- Col 3: CUFE -->
            <div class="p-5">
              <h3 class="text-sm font-bold text-text-primary mb-4">CUFE</h3>
              <div class="space-y-3">
                <p class="text-sm text-text-secondary">
                  Código Único de Factura Electrónica
                </p>
                <div v-if="invoiceData.cufe" class="rounded-xl border border-border bg-surface-secondary/50 p-3">
                  <p class="text-xs font-mono text-text-secondary break-all leading-relaxed">
                    {{ invoiceData.cufe }}
                  </p>
                </div>
                <button v-if="invoiceData.cufe" @click="copyCufe(invoiceData.cufe)"
                  class="w-full min-h-[44px] px-3 py-2 rounded-xl text-sm font-semibold border border-primary/20 text-primary hover:bg-primary/5 transition-colors">
                  {{ copiedCufe ? 'CUFE copiado' : 'Copiar código' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Error message for rejected -->
          <div v-if="invoiceData.status === 'rejected' && invoiceData.error_message"
            class="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-lg p-2.5">
            <svg class="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <span>{{ invoiceData.error_message }}</span>
          </div>
        </template>

        <!-- No invoice — completed order: show emit button -->
        <template v-else-if="order.status === 'completed'">
          <div class="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <span class="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-text-primary leading-tight">Sin factura electrónica</p>
              <p class="text-xs text-text-secondary leading-snug">Genera la factura DIAN cuando lo necesites.</p>
            </div>
            <button @click="emitInvoice" :disabled="isEmittingInvoice"
              class="flex-shrink-0 min-h-[44px] py-2 px-4 rounded-lg text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 flex items-center justify-center gap-2">
              <template v-if="isEmittingInvoice">
                <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Generando…
              </template>
              <template v-else>
                Emitir factura
              </template>
            </button>
          </div>
          <p v-if="emitInvoiceError" class="px-5 pb-3 text-sm text-destructive flex items-center gap-1.5">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            {{ emitInvoiceError }}
          </p>
        </template>

        <!-- No invoice — order not completed -->
        <template v-else>
          <div class="px-5 py-3 flex items-center gap-3">
            <svg class="w-5 h-5 text-text-tertiary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-sm text-text-tertiary">Factura electrónica disponible al completar la orden</p>
          </div>
        </template>
      </div>

      <!-- Status Update Panel (mesa and barra orders) -->
      <div v-if="order.source === 'mesa' || order.source === 'barra'"
        class="bg-surface border border-border rounded-xl p-5 space-y-4">
        <!-- Header -->
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-text-tertiary flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none"
            viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          <h2 class="text-xs font-bold text-text-tertiary uppercase tracking-widest">Actualizar estado</h2>
        </div>

        <!-- Status cards -->
        <div class="grid grid-cols-3 gap-2.5">
          <!-- Pendiente -->
          <button type="button" @click="selectedNewStatus = selectedNewStatus === 'pending' ? '' : 'pending'" :class="[
            'group flex flex-col items-center gap-2.5 py-4 px-2 rounded-xl border-2 transition-all duration-150 focus:outline-none',
            selectedNewStatus === 'pending'
              ? 'bg-status-warning-bg border-status-warning-text/50 shadow-sm'
              : 'bg-surface border-border'
          ]">
            <div
              :class="['w-9 h-9 rounded-full flex items-center justify-center', selectedNewStatus === 'pending' ? 'bg-status-warning-text/15' : 'bg-surface-secondary']">
              <svg class="w-4.5 h-4.5 transition-colors duration-150"
                :class="selectedNewStatus === 'pending' ? 'text-status-warning-text' : 'text-text-tertiary group-hover:text-status-warning-text'"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <span
              :class="['text-xs font-bold uppercase tracking-wider leading-none transition-colors duration-150', selectedNewStatus === 'pending' ? 'text-status-warning-text' : 'text-text-secondary group-hover:text-status-warning-text']">Pendiente</span>
          </button>

          <!-- Completada -->
          <button type="button"
            @click="() => { selectedNewStatus = selectedNewStatus === 'completed' ? '' : 'completed'; selectedPaymentMethod = '' }"
            :class="[
              'group flex flex-col items-center gap-2.5 py-4 px-2 rounded-xl border-2 transition-all duration-150 focus:outline-none',
              selectedNewStatus === 'completed'
                ? 'bg-status-success-bg border-status-success-text/50 shadow-sm'
                : 'bg-surface border-border'
            ]">
            <div
              :class="['w-9 h-9 rounded-full flex items-center justify-center', selectedNewStatus === 'completed' ? 'bg-status-success-text/15' : 'bg-surface-secondary']">
              <svg class="w-4.5 h-4.5 transition-colors duration-150"
                :class="selectedNewStatus === 'completed' ? 'text-status-success-text' : 'text-text-tertiary group-hover:text-status-success-text'"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <span
              :class="['text-xs font-bold uppercase tracking-wider leading-none transition-colors duration-150', selectedNewStatus === 'completed' ? 'text-status-success-text' : 'text-text-secondary group-hover:text-status-success-text']">Completada</span>
          </button>

          <!-- Cancelada -->
          <button type="button" @click="selectedNewStatus = selectedNewStatus === 'cancelled' ? '' : 'cancelled'"
            :class="[
              'group flex flex-col items-center gap-2.5 py-4 px-2 rounded-xl border-2 transition-all duration-150 focus:outline-none',
              selectedNewStatus === 'cancelled'
                ? 'bg-status-critical-bg border-status-critical-text/50 shadow-sm'
                : 'bg-surface border-border'
            ]">
            <div
              :class="['w-9 h-9 rounded-full flex items-center justify-center', selectedNewStatus === 'cancelled' ? 'bg-status-critical-text/15' : 'bg-surface-secondary']">
              <svg class="w-4.5 h-4.5 transition-colors duration-150"
                :class="selectedNewStatus === 'cancelled' ? 'text-status-critical-text' : 'text-text-tertiary group-hover:text-status-critical-text'"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <span
              :class="['text-xs font-bold uppercase tracking-wider leading-none transition-colors duration-150', selectedNewStatus === 'cancelled' ? 'text-status-critical-text' : 'text-text-secondary group-hover:text-status-critical-text']">Cancelada</span>
          </button>
        </div>

        <!-- Payment method (only when completing) -->
        <Transition name="slide-down">
          <div v-if="selectedNewStatus === 'completed'" class="space-y-2">
            <p class="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Método de pago</p>
            <div class="flex flex-wrap gap-2">
              <button v-for="group in paymentGroups" :key="group.slug" type="button"
                @click="selectedPaymentMethod = selectedPaymentMethod === group.slug ? '' : group.slug"
                :class="selectedPaymentMethod === group.slug ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-secondary hover:border-primary/40'"
                class="flex-1 min-h-[44px] px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors">
                {{ group.name }}
              </button>
            </div>
          </div>
        </Transition>

        <!-- Confirm button -->
        <button @click="updateStatus"
          :disabled="!selectedNewStatus || isUpdatingStatus || (selectedNewStatus === 'completed' && !selectedPaymentMethod)"
          :class="[
            'w-full h-11 rounded-xl text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed',
            selectedNewStatus === 'cancelled'
              ? 'bg-status-critical-bg text-status-critical-text border-2 border-status-critical-text/30 hover:bg-status-critical-text hover:text-white'
              : 'bg-primary text-primary-foreground hover:opacity-90 shadow-sm'
          ]">
          <UiLoadingDots v-if="isUpdatingStatus" size="10px" />
          <template v-else>
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Confirmar cambio
          </template>
        </button>
      </div>

      <!-- Order Items -->
      <div class="bg-surface border border-border rounded-xl overflow-hidden">
        <div class="p-6 border-b border-border flex justify-between items-center">
          <h2 class="text-lg font-semibold text-text-primary">Items de la Orden ({{ order.items_count }})</h2>

          <!-- Edit/Save Buttons -->
          <div class="flex gap-2">
            <template v-if="!isEditMode">
              <button @click="enterEditMode"
                class="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar Venta
              </button>
            </template>
            <template v-else>
              <button @click="cancelEdit"
                class="px-4 py-2 border border-border text-text-secondary hover:bg-surface-secondary rounded-lg text-sm font-medium transition-colors">
                Cancelar
              </button>
              <button @click="saveChanges" :disabled="!hasChanges || isSaving"
                class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <svg v-if="isSaving" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none"
                  viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                  </path>
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                {{ isSaving ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </template>
          </div>
        </div>

        <!-- Edit Mode Warning -->
        <div v-if="isEditMode"
          class="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-6 py-3">
          <p class="text-sm text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span><strong>Modo Edición:</strong> Haz clic en la X para eliminar productos o adiciones. Los ingredientes
              se
              devolverán al stock al guardar.</span>
          </p>
        </div>

        <!-- Loading Items -->
        <div v-if="itemsLoading" class="flex items-center justify-center py-12">
          <CommonsTheCustomLoader size="large" />
        </div>

        <!-- Items Table with Expandable Modifiers -->
        <div v-else-if="visibleItems.length > 0" class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-surface-secondary">
              <tr>
                <th v-if="isEditMode" class="px-4 py-3 w-12"></th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider">
                  Producto</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-text-primary uppercase tracking-wider">Cant.
                </th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-text-primary uppercase tracking-wider">Precio
                </th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-text-primary uppercase tracking-wider">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <template v-for="item in visibleItems" :key="item.id">
                <!-- Product Row (Main) -->
                <tr class="bg-surface hover:bg-surface-secondary/50 transition-colors">
                  <td v-if="isEditMode" class="px-4 py-4">
                    <button @click="markItemForDeletion(item.id)"
                      class="w-8 h-8 flex items-center justify-center rounded-full bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
                      title="Eliminar producto">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div
                        class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-lg flex-shrink-0">
                        {{ item.product.image || '🍽️' }}
                      </div>
                      <div>
                        <p class="text-sm font-semibold text-text-primary">{{ item.product.name }}</p>
                        <p v-if="item.notes" class="text-xs text-text-tertiary italic mt-0.5">{{ item.notes }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <span
                      class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {{ item.quantity }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <span class="text-sm font-medium text-text-primary">{{ formatCurrency(item.price_at_purchase)
                    }}</span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <span class="text-sm font-bold text-primary">{{ formatCurrency(item.subtotal) }}</span>
                  </td>
                </tr>

                <!-- Modifier Rows (Sub-rows) -->
                <template v-for="modifier in (item.modifiers || [])" :key="`${item.id}-mod-${modifier.id}`">
                  <tr v-if="!isModifierDeleted(item.id, modifier.id)" class="bg-surface-secondary/30">
                    <td v-if="isEditMode" class="px-4 py-2">
                      <button @click="markModifierForDeletion(item.id, modifier.id)"
                        class="w-6 h-6 flex items-center justify-center rounded-full bg-red-100 hover:bg-red-200 text-red-600 transition-colors ml-2"
                        title="Eliminar adición">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                    <td class="px-6 py-2" :class="isEditMode ? '' : 'pl-14'">
                      <div class="flex items-center gap-2" :class="isEditMode ? 'pl-8' : ''">
                        <span class="text-primary text-xs">+</span>
                        <span class="text-xs text-text-secondary">{{ modifier.name }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-2 text-center">
                      <span class="text-xs text-text-tertiary">x{{ item.quantity }}</span>
                    </td>
                    <td class="px-6 py-2 text-right">
                      <span class="text-xs text-text-secondary">{{ formatCurrency(modifier.price) }}</span>
                    </td>
                    <td class="px-6 py-2 text-right">
                      <span class="text-xs text-primary/70">{{ formatCurrency(modifier.price * item.quantity) }}</span>
                    </td>
                  </tr>
                </template>
              </template>
            </tbody>
            <tfoot class="bg-surface-secondary border-t-2 border-border">
              <tr>
                <td v-if="isEditMode"></td>
                <td colspan="3" class="px-6 py-4 text-right text-sm font-semibold text-text-primary">
                  Total de la Orden:
                </td>
                <td class="px-6 py-4 text-right">
                  <span class="text-xl font-bold text-primary">
                    {{ isEditMode && hasChanges ? formatCurrency(adjustedTotal) : formatCurrency(order.total_amount) }}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>

          <!-- Totals summary — shown when discount or taxes apply -->
          <div v-if="order.discount_amount > 0 || order.standard_tax > 0 || order.liquor_tax > 0"
            class="flex justify-end px-6 py-4 border-t border-border">
            <div class="flex flex-col gap-2 min-w-[220px]">
              <div class="flex items-center justify-between gap-10">
                <span class="text-sm text-text-secondary">Subtotal</span>
                <span class="text-sm text-text-secondary tabular-nums">{{ formatCurrency(grossSubtotal) }}</span>
              </div>
              <div v-if="order.discount_amount > 0" class="flex items-center justify-between gap-10">
                <span class="flex items-center gap-1.5 text-sm text-destructive">
                  Descuento
                  <span
                    class="text-xs font-bold bg-destructive/10 text-destructive rounded-full px-1.5 py-0.5 leading-tight">
                    {{ order.discount_type === 'percent' ? `${order.discount_value}%` : 'Fijo' }}
                  </span>
                </span>
                <span class="text-sm font-semibold text-destructive tabular-nums">-{{
                  formatCurrency(order.discount_amount)
                }}</span>
              </div>
              <div v-if="order.standard_tax > 0" class="flex items-center justify-between gap-10">
                <span class="text-sm text-text-secondary">{{ order.standard_tax_label }}</span>
                <span class="text-sm tabular-nums text-text-secondary">{{ formatCurrency(order.standard_tax) }}</span>
              </div>
              <div v-if="order.liquor_tax > 0" class="flex items-center justify-between gap-10">
                <span class="text-sm text-text-secondary">IVA licores 5%</span>
                <span class="text-sm tabular-nums text-text-secondary">{{ formatCurrency(order.liquor_tax) }}</span>
              </div>
              <div class="flex items-center justify-between gap-10 pt-2 border-t border-border">
                <span class="text-sm font-bold text-text-primary">Total</span>
                <span class="text-base font-bold text-primary tabular-nums">{{ formatCurrency(order.total_amount)
                }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-12">
          <p class="text-sm text-text-secondary">No hay items en esta orden</p>
        </div>
      </div>

    </div>

    <!-- Split Payments Slide-over -->
    <Teleport to="body">
      <!-- Backdrop -->
      <Transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0"
        enter-to-class="opacity-100" leave-active-class="transition-opacity duration-200" leave-from-class="opacity-100"
        leave-to-class="opacity-0">
        <div v-if="showSplitPaymentsPanel" class="fixed inset-0 z-40 bg-black/40"
          @click="showSplitPaymentsPanel = false" aria-hidden="true" />
      </Transition>

      <!-- Panel -->
      <Transition name="panel">
        <div v-if="showSplitPaymentsPanel" role="dialog" aria-modal="true" aria-label="Detalle de cobro dividido"
          class="fixed z-50 flex flex-col bg-surface shadow-2xl
                 inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
                 md:inset-y-0 md:right-0 md:bottom-auto md:left-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full">
          <!-- Mobile drag handle -->
          <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
            <div class="w-10 h-1 rounded-full bg-slate-300" aria-hidden="true" />
          </div>

          <!-- Header -->
          <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center text-info"
                  aria-hidden="true">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                      d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                </div>
                <div class="min-w-0">
                  <h2 class="text-base font-bold text-text-primary leading-tight">Cobro dividido</h2>
                  <p class="text-xs text-text-secondary leading-snug mt-0.5">
                    {{ order.split_payments.length }} pagos · {{ formatCurrency(order.total_amount) }}
                  </p>
                </div>
              </div>
              <button @click="showSplitPaymentsPanel = false" type="button" aria-label="Cerrar panel"
                class="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Payment list -->
          <div class="flex-1 overflow-y-auto px-6 py-4 space-y-2">
            <div v-for="(p, idx) in order.split_payments" :key="p.id"
              class="flex items-center gap-3 bg-surface border border-border rounded-xl px-4 py-3">
              <div class="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg class="h-3.5 w-3.5 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                  fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd"
                    d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                    clip-rule="evenodd" />
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-xs text-text-secondary">Pago #{{ Number(idx) + 1 }}</p>
                <p class="text-sm font-medium text-text-primary">{{ resolveLabel(p.payment_method, p.payment_method_id)
                }}
                </p>
              </div>
              <span class="text-base font-bold text-text-primary tabular-nums flex-shrink-0">{{ formatCurrency(p.amount)
              }}</span>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.panel-enter-active,
.panel-leave-active {
  transition: transform 0.3s ease;
}

.panel-enter-from,
.panel-leave-to {
  transform: translateY(100%);
}

@media (min-width: 768px) {

  .panel-enter-from,
  .panel-leave-to {
    transform: translateX(100%);
  }
}
</style>
