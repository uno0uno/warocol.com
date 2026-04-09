<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({
  layout: 'dashboard'
})

useHead({ title: 'Detalle de Venta' })

// Tenant reactivity
const { currentTenant } = useTenantReactive()

const route = useRoute()
const router = useRouter()

const orderId = computed(() => route.params.id as string)

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
  key: () => ['orders', currentTenant.value?.id, orderId.value],
  query: async () => {
    const response = await $fetch(`/api/orders/${orderId.value}`) as any
    return response.data
  },
  enabled: () => !!currentTenant.value && !!orderId.value,
  staleTime: 60_000,
})

// Load order items
const { data: itemsData, status: itemsStatus, asyncStatus: itemsAsyncStatus, refetch: refetchItems } = useQuery({
  key: () => ['orders', currentTenant.value?.id, orderId.value, 'items'],
  query: async () => {
    const response = await $fetch(`/api/orders/${orderId.value}/items`) as any
    return response.data
  },
  enabled: () => !!currentTenant.value && !!orderId.value,
  staleTime: 60_000,
})

const isLoading = computed(() => !orderData.value && !fetchError.value)
const itemsLoading = computed(() => !itemsData.value)
const isRefreshing = computed(() =>
  (orderAsyncStatus.value === 'loading' && orderData.value != null) ||
  (itemsAsyncStatus.value === 'loading' && itemsData.value != null)
)
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
const handleRefresh = async () => {
  await Promise.all([refetchOrder(), refetchItems()])
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
    'digital': 'Pago Digital',
    'credit': 'Crédito'
  }
  return labels[method] || method
}

// ── Credit panel state ──────────────────────────────────────────────────────
const showCreditPanel = computed(() =>
  order.value &&
  (order.value.payment_status === 'credit' || order.value.payment_status === 'partial')
)

const formatCreditDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  return new Intl.DateTimeFormat('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }).format(d)
}

const { data: creditPaymentsData } = useQuery({
  key: () => ['credit-payments', currentTenant.value?.id, orderId.value],
  query: async () => {
    const res = await $fetch(`/api/credit/orders/${orderId.value}/payments`) as any
    return res.data
  },
  enabled: () => !!currentTenant.value && !!orderId.value && !!showCreditPanel.value,
  staleTime: 30_000,
})

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
          <p class="text-2xl font-bold text-primary">
            {{ isEditMode && hasChanges ? formatCurrency(adjustedTotal) : formatCurrency(order.total_amount) }}
          </p>
          <p v-if="isEditMode && hasChanges" class="text-xs text-text-tertiary line-through">
            {{ formatCurrency(order.total_amount) }}
          </p>
        </div>
      </div>

      <!-- Credit Panel — shown for credit/partial orders -->
      <div v-if="showCreditPanel" class="bg-surface border-2 border-amber-300 dark:border-amber-700 rounded-xl p-5 space-y-5">
        <!-- Header -->
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-amber-600 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <h2 class="text-sm font-bold text-amber-800 dark:text-amber-300 uppercase tracking-widest">Cartera — Venta a Crédito</h2>
          <UiStatusBadge
            :value="order.payment_status === 'partial' ? 'Parcial' : 'Pendiente'"
            format="text"
            :variant="order.payment_status === 'partial' ? 'warning' : 'secondary'"
            size="sm"
          />
        </div>

        <!-- Credit summary grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="bg-surface-secondary rounded-xl p-3">
            <p class="text-xs text-text-secondary mb-1">Total venta</p>
            <p class="text-base font-bold text-text-primary">{{ formatCurrency(order.total_amount) }}</p>
          </div>
          <div class="bg-green-50 dark:bg-green-950/20 rounded-xl p-3">
            <p class="text-xs text-text-secondary mb-1">Pagado</p>
            <p class="text-base font-bold text-green-700 dark:text-green-400">{{ formatCurrency(order.credit_paid_amount ?? 0) }}</p>
          </div>
          <div class="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-3">
            <p class="text-xs text-text-secondary mb-1">Saldo pendiente</p>
            <p class="text-base font-bold text-amber-700 dark:text-amber-400">{{ formatCurrency((order.total_amount ?? 0) - (order.credit_paid_amount ?? 0)) }}</p>
          </div>
          <div class="bg-surface-secondary rounded-xl p-3">
            <p class="text-xs text-text-secondary mb-1">Fecha límite</p>
            <p class="text-sm font-semibold text-text-primary">{{ formatCreditDate(order.credit_due_date) ?? '—' }}</p>
          </div>
        </div>

        <!-- Link to customer profile for payment registration -->
        <NuxtLink
          v-if="orderData?.customer?.id"
          :to="`/analitica/clientes/${orderData.customer.id}`"
          class="flex items-center justify-between w-full px-4 py-3 rounded-xl border-2 border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 hover:border-amber-400 transition-colors group"
        >
          <span class="text-sm font-medium text-amber-800 dark:text-amber-300">Registrar pago en perfil del cliente</span>
          <svg class="w-4 h-4 text-amber-600 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </NuxtLink>

        <!-- Payment history -->
        <div v-if="creditPaymentsData?.payments?.length" class="space-y-2">
          <h3 class="text-xs font-bold text-text-tertiary uppercase tracking-wider">Historial de Pagos</h3>
          <div class="divide-y divide-border border border-border rounded-xl overflow-hidden">
            <div
              v-for="payment in creditPaymentsData.payments"
              :key="payment.id"
              class="flex items-center justify-between px-4 py-3 bg-surface"
            >
              <div>
                <p class="text-sm font-medium text-text-primary">{{ formatCurrency(payment.amount) }}</p>
                <p class="text-xs text-text-secondary">{{ getPaymentMethodLabel(payment.payment_method) }} · {{ formatDate(payment.payment_date) }}</p>
                <p v-if="payment.notes" class="text-xs text-text-tertiary italic">{{ payment.notes }}</p>
              </div>
              <UiStatusBadge value="Pagado" format="text" variant="success" size="sm" />
            </div>
          </div>
        </div>
      </div>

      <!-- Status Update Panel (mesa orders only) -->
      <div v-if="order.source === 'mesa'" class="bg-surface border border-border rounded-xl p-5 space-y-4">
        <!-- Header -->
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-text-tertiary flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          <h2 class="text-xs font-bold text-text-tertiary uppercase tracking-widest">Actualizar estado</h2>
        </div>

        <!-- Status cards -->
        <div class="grid grid-cols-3 gap-2.5">
          <!-- Pendiente -->
          <button
            type="button"
            @click="selectedNewStatus = selectedNewStatus === 'pending' ? '' : 'pending'"
            :class="[
              'group flex flex-col items-center gap-2.5 py-4 px-2 rounded-xl border-2 transition-all duration-150 focus:outline-none',
              selectedNewStatus === 'pending'
                ? 'bg-status-warning-bg border-status-warning-text/50 shadow-sm'
                : 'bg-surface border-border'
            ]"
          >
            <div :class="['w-9 h-9 rounded-full flex items-center justify-center', selectedNewStatus === 'pending' ? 'bg-status-warning-text/15' : 'bg-surface-secondary']">
              <svg class="w-4.5 h-4.5 transition-colors duration-150" :class="selectedNewStatus === 'pending' ? 'text-status-warning-text' : 'text-text-tertiary group-hover:text-status-warning-text'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <span :class="['text-xs font-bold uppercase tracking-wider leading-none transition-colors duration-150', selectedNewStatus === 'pending' ? 'text-status-warning-text' : 'text-text-secondary group-hover:text-status-warning-text']">Pendiente</span>
          </button>

          <!-- Completada -->
          <button
            type="button"
            @click="() => { selectedNewStatus = selectedNewStatus === 'completed' ? '' : 'completed'; selectedPaymentMethod = '' }"
            :class="[
              'group flex flex-col items-center gap-2.5 py-4 px-2 rounded-xl border-2 transition-all duration-150 focus:outline-none',
              selectedNewStatus === 'completed'
                ? 'bg-status-success-bg border-status-success-text/50 shadow-sm'
                : 'bg-surface border-border'
            ]"
          >
            <div :class="['w-9 h-9 rounded-full flex items-center justify-center', selectedNewStatus === 'completed' ? 'bg-status-success-text/15' : 'bg-surface-secondary']">
              <svg class="w-4.5 h-4.5 transition-colors duration-150" :class="selectedNewStatus === 'completed' ? 'text-status-success-text' : 'text-text-tertiary group-hover:text-status-success-text'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <span :class="['text-xs font-bold uppercase tracking-wider leading-none transition-colors duration-150', selectedNewStatus === 'completed' ? 'text-status-success-text' : 'text-text-secondary group-hover:text-status-success-text']">Completada</span>
          </button>

          <!-- Cancelada -->
          <button
            type="button"
            @click="selectedNewStatus = selectedNewStatus === 'cancelled' ? '' : 'cancelled'"
            :class="[
              'group flex flex-col items-center gap-2.5 py-4 px-2 rounded-xl border-2 transition-all duration-150 focus:outline-none',
              selectedNewStatus === 'cancelled'
                ? 'bg-status-critical-bg border-status-critical-text/50 shadow-sm'
                : 'bg-surface border-border'
            ]"
          >
            <div :class="['w-9 h-9 rounded-full flex items-center justify-center', selectedNewStatus === 'cancelled' ? 'bg-status-critical-text/15' : 'bg-surface-secondary']">
              <svg class="w-4.5 h-4.5 transition-colors duration-150" :class="selectedNewStatus === 'cancelled' ? 'text-status-critical-text' : 'text-text-tertiary group-hover:text-status-critical-text'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <span :class="['text-xs font-bold uppercase tracking-wider leading-none transition-colors duration-150', selectedNewStatus === 'cancelled' ? 'text-status-critical-text' : 'text-text-secondary group-hover:text-status-critical-text']">Cancelada</span>
          </button>
        </div>

        <!-- Payment method (only when completing) -->
        <Transition name="slide-down">
          <div v-if="selectedNewStatus === 'completed'" class="space-y-2">
            <p class="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Método de pago</p>
            <div class="grid grid-cols-3 gap-2">
              <!-- Efectivo -->
              <button
                type="button"
                @click="selectedPaymentMethod = selectedPaymentMethod === 'cash' ? '' : 'cash'"
                :class="['flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all duration-150 focus:outline-none', selectedPaymentMethod === 'cash' ? 'bg-primary/8 border-primary text-primary' : 'bg-surface border-border text-text-secondary hover:border-primary/40 hover:text-text-primary']"
              >
                <div class="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0">
                  <svg class="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                  </svg>
                </div>
                <span class="text-xs font-semibold">Efectivo</span>
              </button>
              <!-- Tarjeta -->
              <button
                type="button"
                @click="selectedPaymentMethod = selectedPaymentMethod === 'card' ? '' : 'card'"
                :class="['flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all duration-150 focus:outline-none', selectedPaymentMethod === 'card' ? 'bg-primary/8 border-primary text-primary' : 'bg-surface border-border text-text-secondary hover:border-primary/40 hover:text-text-primary']"
              >
                <div class="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                  <svg class="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                  </svg>
                </div>
                <span class="text-xs font-semibold">Datáfono</span>
              </button>
              <!-- Digital / QR -->
              <button
                type="button"
                @click="selectedPaymentMethod = selectedPaymentMethod === 'digital' ? '' : 'digital'"
                :class="['flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all duration-150 focus:outline-none', selectedPaymentMethod === 'digital' ? 'bg-primary/8 border-primary text-primary' : 'bg-surface border-border text-text-secondary hover:border-primary/40 hover:text-text-primary']"
              >
                <div class="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
                  <svg class="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
                  </svg>
                </div>
                <span class="text-xs font-semibold">QR</span>
              </button>
            </div>
          </div>
        </Transition>

        <!-- Confirm button -->
        <button
          @click="updateStatus"
          :disabled="!selectedNewStatus || isUpdatingStatus || (selectedNewStatus === 'completed' && !selectedPaymentMethod)"
          :class="[
            'w-full h-11 rounded-xl text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed',
            selectedNewStatus === 'cancelled'
              ? 'bg-status-critical-bg text-status-critical-text border-2 border-status-critical-text/30 hover:bg-status-critical-text hover:text-white'
              : 'bg-primary text-primary-foreground hover:opacity-90 shadow-sm'
          ]"
        >
          <UiLoadingDots v-if="isUpdatingStatus" size="10px" />
          <template v-else>
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
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
              <button
                @click="enterEditMode"
                class="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar Venta
              </button>
            </template>
            <template v-else>
              <button
                @click="cancelEdit"
                class="px-4 py-2 border border-border text-text-secondary hover:bg-surface-secondary rounded-lg text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                @click="saveChanges"
                :disabled="!hasChanges || isSaving"
                class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg v-if="isSaving" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
        <div v-if="isEditMode" class="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-6 py-3">
          <p class="text-sm text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span><strong>Modo Edición:</strong> Haz clic en la X para eliminar productos o adiciones. Los ingredientes se devolverán al stock al guardar.</span>
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
                <th class="px-6 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider">Producto</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-text-primary uppercase tracking-wider">Cant.</th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-text-primary uppercase tracking-wider">Precio</th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-text-primary uppercase tracking-wider">Subtotal</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <template v-for="item in visibleItems" :key="item.id">
                <!-- Product Row (Main) -->
                <tr class="bg-surface hover:bg-surface-secondary/50 transition-colors">
                  <td v-if="isEditMode" class="px-4 py-4">
                    <button
                      @click="markItemForDeletion(item.id)"
                      class="w-8 h-8 flex items-center justify-center rounded-full bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
                      title="Eliminar producto"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-lg flex-shrink-0">
                        {{ item.product.image || '🍽️' }}
                      </div>
                      <div>
                        <p class="text-sm font-semibold text-text-primary">{{ item.product.name }}</p>
                        <p v-if="item.notes" class="text-xs text-text-tertiary italic mt-0.5">{{ item.notes }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {{ item.quantity }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <span class="text-sm font-medium text-text-primary">{{ formatCurrency(item.price_at_purchase) }}</span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <span class="text-sm font-bold text-primary">{{ formatCurrency(item.subtotal) }}</span>
                  </td>
                </tr>

                <!-- Modifier Rows (Sub-rows) -->
                <template v-for="modifier in (item.modifiers || [])" :key="`${item.id}-mod-${modifier.id}`">
                  <tr
                    v-if="!isModifierDeleted(item.id, modifier.id)"
                    class="bg-surface-secondary/30"
                  >
                    <td v-if="isEditMode" class="px-4 py-2">
                      <button
                        @click="markModifierForDeletion(item.id, modifier.id)"
                        class="w-6 h-6 flex items-center justify-center rounded-full bg-red-100 hover:bg-red-200 text-red-600 transition-colors ml-2"
                        title="Eliminar adición"
                      >
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
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
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-12">
          <p class="text-sm text-text-secondary">No hay items en esta orden</p>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
