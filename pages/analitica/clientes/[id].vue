<script setup lang="ts">
import { ref, computed, reactive, inject, onMounted, onUnmounted, watch } from 'vue';
import { es } from 'date-fns/locale';
import { format as fnsFormat } from 'date-fns';
import MetricCard from '~/components/shared/MetricCard.vue';
import type { WaroTransaction } from '~/composables/useWarosCliente';
import { PAYMENT_DEFAULTS } from '~/utils/paymentDefaults';

definePageMeta({ layout: 'dashboard' })

const route = useRoute()
const router = useRouter()
const { currentTenant } = useTenantReactive()

const customerId = computed(() => route.params.id as string)

// Payment groups for the payment form select
const { data: paymentGroupsData } = useQuery({
  key: () => ['payments', 'groups', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: { id: string; slug: string; name: string; methods: { id: string; name: string }[] }[] }>('/api/pos/payment-methods'),
  enabled: () => !!currentTenant.value,
  staleTime: 300_000,
})
const paymentGroups = computed(() => paymentGroupsData.value?.data ?? [])
const { resolveLabel } = usePaymentLabel(paymentGroups)

// ── Layout actions ────────────────────────────────────────────────────────
const setShowBackButton = inject<(show: boolean) => void>('setShowBackButton')
const setBackHandler = inject<(handler: (() => void) | undefined) => void>('setBackHandler')

const goBack = () => router.push('/analitica/clientes')

// ── Filters ───────────────────────────────────────────────────────────────
const dateRangeDates = ref<Date[] | null>(null);

const presetDates = ref([
  { label: 'Hoy', value: [new Date(), new Date()] },
  { label: 'Ayer', value: (() => { const d = new Date(); d.setDate(d.getDate() - 1); return [d, d] })() },
  { label: 'Última semana', value: [(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d })(), new Date()] },
  { label: 'Últimos 15 días', value: [(() => { const d = new Date(); d.setDate(d.getDate() - 15); return d })(), new Date()] },
  { label: 'Último mes', value: [(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d })(), new Date()] },
  { label: 'Últimos 90 días', value: [(() => { const d = new Date(); d.setDate(d.getDate() - 90); return d })(), new Date()] },
]);

const formatDateRange = (dates: Date[]) => {
  if (!dates || !dates[0]) return ''
  const from = fnsFormat(dates[0], 'dd/MM/yy', { locale: es })
  if (!dates[1]) return from
  return `${from} - ${fnsFormat(dates[1], 'dd/MM/yy', { locale: es })}`
};

const dateRange = computed(() => {
  if (!dateRangeDates.value || dateRangeDates.value.length < 2) return { from: null, to: null }
  const [from, to] = dateRangeDates.value
  if (!from || !to) return { from: null, to: null }
  return { from: fnsFormat(from, 'yyyy-MM-dd'), to: fnsFormat(to, 'yyyy-MM-dd') }
});

// ── Pagination ────────────────────────────────────────────────────────────
const currentPage = ref(1)
const perPage = 20

// ── Data fetch ────────────────────────────────────────────────────────────
const { data: apiData, pending: isLoading, error: fetchError, refresh } = useAsyncData(
  `customer-detail-${customerId.value}`,
  () => $fetch(`/api/orders/customers/${customerId.value}`, {
    params: {
      date_from: dateRange.value.from || undefined,
      date_to: dateRange.value.to || undefined,
      page: currentPage.value,
      per_page: perPage,
    }
  }),
  {
    server: false,
    watch: [currentTenant, dateRangeDates, currentPage],
  }
)

const customer = computed(() => (apiData.value as any)?.customer || null)
const realEmail = computed(() => {
  const email = customer.value?.email
  if (!email || email.endsWith('@customer.temp')) return null
  return email
})
const avgTicket = computed(() => {
  const c = customer.value
  if (!c || !c.total_orders) return 0
  return c.total_spent / c.total_orders
})
const ordersData = computed(() => (apiData.value as any)?.orders || { items: [], total: 0, page: 1, per_page: perPage })
const orders = computed(() => ordersData.value?.items || [])
const totalOrders = computed(() => ordersData.value?.total || 0)

const totalPages = computed(() => Math.ceil(totalOrders.value / perPage))
const canGoPrevious = computed(() => currentPage.value > 1)
const canGoNext = computed(() => currentPage.value < totalPages.value)
const startItem = computed(() => totalOrders.value === 0 ? 0 : (currentPage.value - 1) * perPage + 1)
const endItem = computed(() => Math.min(currentPage.value * perPage, totalOrders.value))

// ── Helpers ───────────────────────────────────────────────────────────────
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value || 0)

const formatDate = (isoDate: string) => {
  if (!isoDate) return '-'
  try { return fnsFormat(new Date(isoDate), 'dd/MM/yyyy', { locale: es }) }
  catch { return isoDate }
}


const statusLabels: Record<string, string> = {
  completed: 'Completado',
  cancelled: 'Cancelado',
  pending: 'Pendiente',
}
const statusColors: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
}

// ── Actions ───────────────────────────────────────────────────────────────
const previousPage = () => { if (canGoPrevious.value) currentPage.value-- }
const nextPage = () => { if (canGoNext.value) currentPage.value++ }
const clearFilters = () => { dateRangeDates.value = null; currentPage.value = 1 }

watch(dateRangeDates, () => { currentPage.value = 1 })

// ── Table columns ─────────────────────────────────────────────────────────
const tableColumns = [
  { key: 'order_number', title: '# Pedido', sortable: false },
  { key: 'date', title: 'Fecha', sortable: false },
  { key: 'items_count', title: '# Productos', sortable: false },
  { key: 'total', title: 'Total', sortable: false },
  { key: 'payment_method', title: 'Forma de pago', sortable: false },
  { key: 'payment_status', title: 'Crédito', sortable: false },
  { key: 'invoice', title: 'Factura', sortable: false },
  { key: 'status', title: 'Estado', sortable: false },
  { key: 'waros_earned', title: 'Waros', sortable: false },
]

// Invoice slideover state
const showInvoicePanel = ref(false)
const selectedInvoice = ref<{ id: string; prefix: string; number: number; status: string; cufe: string; orderId: string } | null>(null)
const invoicePdfUrl = ref('')
const invoicePdfLoading = ref(false)
const copiedCufe = ref(false)

const openInvoicePanel = async (order: any) => {
  if (!order.invoice_id || order.invoice_status !== 'accepted') return
  selectedInvoice.value = {
    id: order.invoice_id,
    prefix: order.invoice_prefix,
    number: order.invoice_number,
    status: order.invoice_status,
    cufe: order.invoice_cufe,
    orderId: order.order_id,
  }
  invoicePdfUrl.value = ''
  invoicePdfLoading.value = true
  showInvoicePanel.value = true
  try {
    const result = await $fetch<any>(`/api/documents/${order.invoice_id}/pdf`)
    invoicePdfUrl.value = result.pdf_url || ''
  } catch {
    invoicePdfUrl.value = ''
  } finally {
    invoicePdfLoading.value = false
  }
}

const copyCufe = async (cufe: string) => {
  try {
    await navigator.clipboard.writeText(cufe)
    copiedCufe.value = true
    setTimeout(() => { copiedCufe.value = false }, 2000)
  } catch { /* fallback: do nothing */ }
}

// ── Edit customer ─────────────────────────────────────────────────────────
const showEditForm = ref(false)
const editForm = reactive({ name: '', phone_number: '', email: '' })
const isSavingEdit = ref(false)
const editError = ref<string | null>(null)

const openEditForm = () => {
  editForm.name = customer.value?.name || ''
  editForm.phone_number = customer.value?.phone || ''
  editForm.email = realEmail.value || ''
  editError.value = null
  showEditForm.value = true
}

const saveEdit = async () => {
  if (isSavingEdit.value) return
  isSavingEdit.value = true
  editError.value = null
  try {
    await $fetch(`/api/customers/${customerId.value}`, {
      method: 'PATCH',
      body: {
        name: editForm.name.trim() || undefined,
        phone_number: editForm.phone_number.trim() || undefined,
        email: editForm.email.trim() || undefined,
      }
    })
    showEditForm.value = false
    await refresh()
  } catch (err: any) {
    editError.value = err?.data?.detail || 'Error al guardar los cambios'
  } finally {
    isSavingEdit.value = false
  }
}

// ── Waros ─────────────────────────────────────────────────────────────────
const showWarosModal = ref(false)
const showManualPanel = ref(false)

// ── Wallet COP ────────────────────────────────────────────────────────────
const showWalletRechargeModal = ref(false)
const {
  wallet,
  isLoading: isLoadingWallet,
  walletError: walletLoadError,
  recharge,
  resetRecharge,
  refetch: refetchWallet,
} = useCustomerWallet(customerId)

const walletBalance = computed(() => wallet.value?.balance_cop ?? 0)
const walletMovements = computed(() => wallet.value?.movements ?? [])

const walletPaymentGroups = computed(() => {
  const groups = paymentGroups.value.filter(
    g => g.slug !== 'credit' && g.slug !== 'customer_wallet',
  )
  if (groups.length) return groups
  return PAYMENT_DEFAULTS.filter(
    g => g.slug !== 'credit' && g.slug !== 'customer_wallet',
  )
})

const walletMovementLabel = (type: string) => {
  if (type === 'recharge') return 'Recarga'
  if (type === 'redeem') return 'Uso en pedido'
  if (type === 'refund') return 'Devolución'
  return type
}

const onWalletRecharged = async () => {
  await refetchWallet()
}

// Waros data comes from the main apiData response (no separate call)
const warosSummary = computed(() => (apiData.value as any)?.waros_summary ?? null)
const isLoadingWaros = computed(() => isLoading.value)
const warosBalance = computed(() => warosSummary.value?.current_balance ?? 0)

const onWarosAssigned = async (payload: { newBalance: number }) => {
  // Refetch main data to get updated Waros balance + transactions
  await refresh()
}

const formatWarosDate = (isoDate: string) => {
  if (!isoDate) return '-'
  try { return fnsFormat(new Date(isoDate), 'dd/MM/yyyy', { locale: es }) }
  catch { return isoDate }
}

const txTypeLabel = (type: string) => {
  if (type === 'earned') return 'Compra'
  if (type === 'manual') return 'Manual'
  return type
}

// ── Cartera ───────────────────────────────────────────────────────────────
const carteraData = ref<any>(null)
const isLoadingCartera = ref(false)

const fetchCartera = async () => {
  if (!customerId.value) return
  isLoadingCartera.value = true
  try {
    const res = await $fetch<any>(`/api/cartera/customers/${customerId.value}`)
    carteraData.value = res.data ?? res
  } catch {
    // Non-critical — cartera section hidden on error
  } finally {
    isLoadingCartera.value = false
  }
}

const showPaymentPanel = ref(false)
const selectedOrder = ref<any>(null)
const isGlobalPayment = ref(false)
const paymentForm = reactive({ amount: 0, payment_method: 'cash', notes: '' })
const isSubmittingPayment = ref(false)
const paymentError = ref<string | null>(null)

const openPaymentPanel = (order: any) => {
  isGlobalPayment.value = false
  selectedOrder.value = order
  paymentForm.amount = order.remaining ?? order.total_amount
  paymentForm.payment_method = 'cash'
  paymentForm.notes = ''
  paymentError.value = null
  showPaymentPanel.value = true
}

const openGlobalPaymentPanel = () => {
  isGlobalPayment.value = true
  selectedOrder.value = null
  paymentForm.amount = carteraData.value?.summary?.total_outstanding ?? 0
  paymentForm.payment_method = 'cash'
  paymentForm.notes = ''
  paymentError.value = null
  showPaymentPanel.value = true
}

const submitPayment = async () => {
  if (isSubmittingPayment.value) return
  isSubmittingPayment.value = true
  paymentError.value = null
  try {
    if (isGlobalPayment.value) {
      // FIFO: distribute across orders sorted oldest-first
      const orders = [...(carteraData.value?.orders ?? [])]
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      let remaining = paymentForm.amount
      for (const order of orders) {
        if (remaining <= 0) break
        const toPay = Math.min(remaining, order.remaining)
        await $fetch(`/api/credit/orders/${order.id}/payments`, {
          method: 'POST',
          body: { amount: toPay, payment_method: paymentForm.payment_method, notes: paymentForm.notes || undefined }
        })
        remaining -= toPay
      }
    } else {
      if (!selectedOrder.value) return
      await $fetch(`/api/credit/orders/${selectedOrder.value.id}/payments`, {
        method: 'POST',
        body: {
          amount: paymentForm.amount,
          payment_method: paymentForm.payment_method,
          notes: paymentForm.notes || undefined,
        }
      })
    }
    showPaymentPanel.value = false
    await fetchCartera()
  } catch (err: any) {
    paymentError.value = err?.data?.detail || 'Error al registrar el pago'
  } finally {
    isSubmittingPayment.value = false
  }
}

onMounted(() => {
  setShowBackButton?.(true)
  setBackHandler?.(goBack)
  fetchCartera()
})

onUnmounted(() => {
  setShowBackButton?.(false)
  setBackHandler?.(undefined)
})
</script>

<template>
  <div class="space-y-4">

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- 404 / Error -->
    <div v-else-if="fetchError || (!isLoading && !customer)" class="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <p class="text-xl font-semibold text-text-primary">Cliente no encontrado</p>
      <p class="text-sm text-text-secondary">{{ (fetchError as any)?.message || 'Este cliente no existe o no tiene pedidos en tu restaurante.' }}</p>
      <button @click="goBack" class="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors min-h-[44px]">
        ← Volver a Clientes
      </button>
    </div>

    <!-- Main Content -->
    <div v-else-if="customer" class="flex flex-col gap-4 pb-20">

      <!-- Customer Header Card -->
      <div class="bg-white border border-border rounded-xl overflow-hidden">
        <!-- Top: Identity + Total -->
        <div class="p-5 sm:p-6">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <!-- Avatar + Name -->
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span class="text-lg font-bold text-primary">{{ customer.name?.[0]?.toUpperCase() || '?' }}</span>
              </div>
              <div class="min-w-0">
                <h2 class="text-xl font-bold text-text-primary truncate">{{ customer.name }}</h2>
                <p class="text-xs text-text-secondary uppercase tracking-wider font-medium mt-0.5">Cliente POS</p>
              </div>
            </div>
            <!-- Total comprado + edit button -->
            <div class="flex items-center gap-3 flex-shrink-0">
              <div class="text-left sm:text-right">
                <p class="text-2xl sm:text-3xl font-bold text-text-primary">{{ formatCurrency(customer.total_spent) }}</p>
                <p class="text-xs text-text-secondary uppercase tracking-wider font-medium mt-0.5">Total comprado</p>
              </div>
              <button
                type="button"
                aria-label="Editar datos del cliente"
                @click="openEditForm"
                class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Edit form (inline, shows on edit button click) -->
        <div v-if="showEditForm" class="border-t border-border bg-surface px-5 py-4">
          <p class="text-xs text-text-secondary uppercase tracking-wider font-medium mb-3">Editar datos del cliente</p>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="flex flex-col gap-1">
              <label for="edit-name" class="text-xs font-medium text-text-secondary">Nombre</label>
              <input
                id="edit-name"
                v-model="editForm.name"
                type="text"
                placeholder="Nombre completo"
                :disabled="isSavingEdit"
                class="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label for="edit-phone" class="text-xs font-medium text-text-secondary">Teléfono</label>
              <input
                id="edit-phone"
                v-model="editForm.phone_number"
                type="tel"
                placeholder="3001234567"
                :disabled="isSavingEdit"
                class="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label for="edit-email" class="text-xs font-medium text-text-secondary">Correo electrónico</label>
              <input
                id="edit-email"
                v-model="editForm.email"
                type="email"
                placeholder="cliente@email.com"
                :disabled="isSavingEdit"
                class="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
              />
            </div>
          </div>
          <p v-if="editError" class="mt-2 text-sm text-red-600">{{ editError }}</p>
          <div class="flex gap-2 mt-3">
            <button
              type="button"
              @click="saveEdit"
              :disabled="isSavingEdit"
              class="min-h-[44px] px-5 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSavingEdit ? 'Guardando...' : 'Guardar' }}
            </button>
            <button
              type="button"
              @click="showEditForm = false"
              :disabled="isSavingEdit"
              class="min-h-[44px] px-5 py-2 bg-surface border border-border text-sm font-medium text-text-secondary rounded-lg hover:bg-surface-secondary active:scale-95 transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>

        <!-- Info Grid (factura style) -->
        <div class="grid grid-cols-2 sm:grid-cols-4 border-t border-border divide-border">
          <!-- Phone -->
          <div class="p-4 border-b sm:border-b-0 border-r border-border">
            <div class="flex items-center gap-1.5 mb-1.5">
              <svg class="w-3.5 h-3.5 text-text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <p class="text-xs text-text-secondary uppercase tracking-wider font-medium">Teléfono</p>
            </div>
            <p class="text-sm font-semibold text-text-primary">{{ customer.phone || '-' }}</p>
          </div>
          <!-- Email -->
          <div class="p-4 border-b sm:border-b-0 sm:border-r border-border">
            <div class="flex items-center gap-1.5 mb-1.5">
              <svg class="w-3.5 h-3.5 text-text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p class="text-xs text-text-secondary uppercase tracking-wider font-medium">Email</p>
            </div>
            <p class="text-sm font-semibold text-text-primary truncate">{{ realEmail || '-' }}</p>
          </div>
          <!-- Primera compra -->
          <div class="p-4 border-r border-border">
            <div class="flex items-center gap-1.5 mb-1.5">
              <svg class="w-3.5 h-3.5 text-text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p class="text-xs text-text-secondary uppercase tracking-wider font-medium">Primera compra</p>
            </div>
            <p class="text-sm font-semibold text-text-primary">{{ formatDate(customer.first_purchase) }}</p>
          </div>
          <!-- Última compra -->
          <div class="p-4">
            <div class="flex items-center gap-1.5 mb-1.5">
              <svg class="w-3.5 h-3.5 text-text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-xs text-text-secondary uppercase tracking-wider font-medium">Última compra</p>
            </div>
            <p class="text-sm font-semibold text-text-primary">{{ formatDate(customer.last_purchase) }}</p>
          </div>
        </div>

        <!-- Waros section -->
        <div class="border-t border-border px-5 py-4">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-xs text-text-secondary uppercase tracking-wider font-medium mb-0.5">Puntos Waros</p>
              <p v-if="isLoadingWaros" class="text-sm font-semibold text-text-secondary">Cargando...</p>
              <p v-else class="text-sm font-semibold text-amber-700">{{ warosBalance.toLocaleString('es-CO') }}</p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <button
                v-if="!isLoadingWaros && warosSummary?.manual_transactions?.length > 0"
                type="button"
                aria-label="Ver asignaciones manuales de Waros"
                @click="showManualPanel = true"
                class="min-h-[44px] px-3 text-sm font-medium rounded-lg border border-border text-text-secondary hover:bg-surface-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                Ver manuales
              </button>
              <button
                type="button"
                aria-label="Asignar o quitar Waros a este cliente"
                @click="showWarosModal = true"
                class="min-h-[44px] px-4 text-sm font-semibold rounded-lg border-2 border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              >
                + Asignar puntos
              </button>
            </div>
          </div>
        </div>

        <!-- Wallet COP section -->
        <div class="border-t border-border px-5 py-4">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-xs text-text-secondary uppercase tracking-wider font-medium mb-0.5">Billetera COP</p>
              <p v-if="isLoadingWallet" class="text-sm font-semibold text-text-secondary">Cargando...</p>
              <p v-else-if="walletLoadError" class="text-sm font-semibold text-red-600">No se pudo cargar</p>
              <p v-else class="text-sm font-semibold text-primary">{{ formatCurrency(walletBalance) }}</p>
            </div>
            <button
              type="button"
              aria-label="Recargar billetera del cliente"
              @click="showWalletRechargeModal = true"
              class="min-h-[44px] px-4 text-sm font-semibold rounded-lg border-2 border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
            >
              + Recargar
            </button>
          </div>
          <div v-if="walletMovements.length" class="mt-3 space-y-2 max-h-40 overflow-y-auto">
            <div
              v-for="mov in walletMovements.slice(0, 5)"
              :key="mov.id"
              class="flex items-center justify-between gap-3 text-sm py-1.5 border-b border-border/50 last:border-0"
            >
              <div class="min-w-0">
                <p class="text-text-primary font-medium">{{ walletMovementLabel(mov.movement_type) }}</p>
                <p class="text-xs text-text-secondary">{{ formatDate(mov.created_at) }}</p>
              </div>
              <span
                :class="[
                  'font-semibold flex-shrink-0',
                  mov.amount_cop >= 0 ? 'text-green-700' : 'text-red-600',
                ]"
              >
                {{ mov.amount_cop >= 0 ? '+' : '' }}{{ formatCurrency(Math.abs(mov.amount_cop)) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 gap-4">
        <MetricCard title="Total pedidos" :value="customer.total_orders" format="number" variant="primary" />
        <MetricCard title="Ticket promedio" :value="avgTicket" format="currency" variant="primary" />
      </div>

      <!-- Cartera Section -->
      <div v-if="carteraData && carteraData.summary?.total_outstanding > 0" class="bg-white border border-border rounded-xl overflow-hidden">
        <!-- Header -->
        <div class="px-5 py-4 border-b border-border flex items-center justify-between">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Cartera</h3>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-lg font-bold text-red-600">{{ formatCurrency(carteraData.summary.total_outstanding) }}</span>
            <button
              @click="openGlobalPaymentPanel"
              class="min-h-[36px] px-3 text-xs font-semibold rounded-lg bg-surface-secondary border-0 text-primary hover:bg-surface-secondary/80 transition-all focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Abonar a la cartera total del cliente"
            >
              Abonar a cartera
            </button>
          </div>
        </div>
        <!-- Summary strip -->
        <div class="grid grid-cols-3 divide-x divide-border border-b border-border">
          <div class="px-4 py-3">
            <p class="text-xs text-text-secondary uppercase tracking-wider font-medium mb-0.5">Órdenes</p>
            <p class="text-sm font-semibold text-text-primary">{{ carteraData.summary.order_count }}</p>
          </div>
          <div class="px-4 py-3">
            <p class="text-xs text-text-secondary uppercase tracking-wider font-medium mb-0.5">Vencidas</p>
            <p class="text-sm font-semibold" :class="carteraData.summary.overdue_count > 0 ? 'text-red-600' : 'text-text-secondary'">
              {{ carteraData.summary.overdue_count }}
            </p>
          </div>
          <div class="px-4 py-3">
            <p class="text-xs text-text-secondary uppercase tracking-wider font-medium mb-0.5">Monto vencido</p>
            <p class="text-sm font-semibold" :class="carteraData.summary.overdue_amount > 0 ? 'text-red-600' : 'text-text-secondary'">
              {{ formatCurrency(carteraData.summary.overdue_amount) }}
            </p>
          </div>
        </div>
        <!-- Credit orders list -->
        <UiResponsiveDataView
          row-size="sm"
          :columns="[
            { key: 'order_number', title: '# Orden', sortable: false },
            { key: 'date', title: 'Fecha', sortable: false },
            { key: 'total_amount', title: 'Total', sortable: false },
            { key: 'credit_paid_amount', title: 'Pagado', sortable: false },
            { key: 'remaining', title: 'Resta', sortable: false },
            { key: 'due_date', title: 'Vence', sortable: false },
            { key: 'status_badge', title: 'Estado', sortable: false },
            { key: 'cartera_actions', title: '', sortable: false },
          ]"
          :data="carteraData.orders || []"
          empty-message="Sin órdenes en crédito"
          variant="default"
        >
          <!-- Mobile card -->
          <template #card="{ item }">
            <div class="p-4 border-b border-border">
              <div class="flex justify-between items-start mb-2">
                <div>
                  <p class="text-sm font-semibold text-text-primary"># {{ item.order_number }}</p>
                  <p class="text-xs text-text-secondary mt-0.5">{{ formatDate(item.date) }}</p>
                </div>
                <span :class="[
                  'text-xs px-2 py-1 rounded-full font-medium',
                  item.is_overdue ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                ]">{{ item.is_overdue ? 'Vencida' : 'Al día' }}</span>
              </div>
              <div class="text-sm text-text-secondary mb-3">
                Resta <span class="font-bold text-text-primary">{{ formatCurrency(item.remaining) }}</span>
                de {{ formatCurrency(item.total_amount) }}
                <span v-if="item.due_date"> · Vence {{ formatDate(item.due_date) }}</span>
              </div>
              <button
                @click="openPaymentPanel(item)"
                class="w-full min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg bg-surface-secondary border-0 text-primary hover:bg-surface-secondary/80 transition-all focus:outline-none focus:ring-2 focus:ring-ring"
                :aria-label="`Registrar pago para orden #${item.order_number}`"
              >
                Registrar pago
              </button>
            </div>
          </template>
          <!-- Desktop cells -->
          <template #cell-order_number="{ value }"><span class="text-sm font-medium">#{{ value }}</span></template>
          <template #cell-date="{ value }"><span class="text-sm text-text-secondary">{{ formatDate(value) }}</span></template>
          <template #cell-total_amount="{ value }"><span class="text-sm">{{ formatCurrency(value) }}</span></template>
          <template #cell-credit_paid_amount="{ value }"><span class="text-sm text-green-700">{{ formatCurrency(value) }}</span></template>
          <template #cell-remaining="{ value }"><span class="text-sm font-semibold text-text-primary">{{ formatCurrency(value) }}</span></template>
          <template #cell-due_date="{ value }"><span class="text-sm text-text-secondary">{{ value ? formatDate(value) : '—' }}</span></template>
          <template #cell-status_badge="{ row }">
            <span :class="[
              'text-xs px-2 py-1 rounded-full font-medium',
              row.is_overdue ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
            ]">{{ row.is_overdue ? 'Vencida' : 'Al día' }}</span>
          </template>
          <template #cell-cartera_actions="{ row }">
            <button
              @click="openPaymentPanel(row)"
              class="min-h-[36px] px-3 text-xs font-semibold rounded-lg bg-surface-secondary border-0 text-primary hover:bg-surface-secondary/80 transition-all focus:outline-none focus:ring-2 focus:ring-ring"
              :aria-label="`Registrar pago para orden #${row.order_number}`"
            >
              Pagar
            </button>
          </template>
        </UiResponsiveDataView>
      </div>

      <!-- Date Filter -->
      <ClientOnly>
        <div class="flex items-center gap-2 overflow-x-auto pb-1">
          <VueDatePicker
            v-model="dateRangeDates"
            range
            :preset-dates="presetDates"
            :enable-time-picker="false"
            :locale="es"
            placeholder="Filtrar por período"
            auto-apply
            :teleport="true"
            :max-date="new Date()"
            :format="formatDateRange"
            input-class-name="dp-custom-input"
            menu-class-name="dp-custom-menu"
            calendar-cell-class-name="dp-custom-cell"
          />
          <button
            v-if="dateRangeDates"
            @click="clearFilters"
            class="h-10 px-3 rounded-lg border-2 border-slate-200 bg-white text-sm text-slate-500 hover:text-slate-700 hover:border-indigo-500 transition-colors"
            title="Limpiar filtro"
            aria-label="Limpiar filtro de fechas"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </ClientOnly>

      <!-- Order History Table -->
      <UiResponsiveDataView
        row-size="sm"
        :columns="tableColumns"
        :data="orders"
        title="Historial de pedidos"
        empty-message="Sin pedidos en este período"
        empty-sub-message="Prueba cambiando el rango de fechas"
        variant="default"
      >
        <template #header>
          <h3 class="text-base font-bold text-text-primary">
            Historial de pedidos
            <span v-if="totalOrders > 0" class="ml-2 text-sm font-normal text-text-secondary">({{ totalOrders }} total)</span>
          </h3>
        </template>

        <!-- Mobile Card -->
        <template #card="{ item }">
          <div class="bg-white border border-border rounded-lg p-4">
            <div class="flex justify-between items-start mb-2">
              <div>
                <p class="font-medium text-text-primary"># {{ item.order_number }}</p>
                <p class="text-sm text-text-secondary">{{ formatDate(item.date) }}</p>
              </div>
              <span :class="['text-xs px-2 py-1 rounded-full font-medium', statusColors[item.status] || 'bg-gray-100 text-gray-800']">
                {{ statusLabels[item.status] || item.status }}
              </span>
            </div>
            <div class="flex justify-between items-center text-sm">
              <span class="text-text-secondary">{{ item.items_count }} productos · {{ resolveLabel(item.payment_method) }}</span>
              <span class="font-bold text-text-primary">{{ formatCurrency(item.total) }}</span>
            </div>
          </div>
        </template>

        <!-- Desktop Cells -->
        <template #cell-order_number="{ value }">
          <span class="text-sm font-medium text-text-primary">#{{ value }}</span>
        </template>

        <template #cell-date="{ value }">
          <span class="text-sm text-text-secondary">{{ formatDate(value) }}</span>
        </template>

        <template #cell-items_count="{ value }">
          <span class="text-sm text-text-primary">{{ value }}</span>
        </template>

        <template #cell-total="{ value }">
          <span class="text-sm font-semibold text-text-primary">{{ formatCurrency(value) }}</span>
        </template>

        <template #cell-payment_method="{ value }">
          <span class="text-sm text-text-secondary">{{ resolveLabel(value) }}</span>
        </template>

        <template #cell-payment_status="{ row }">
          <template v-if="row.payment_status === 'credit' || row.payment_status === 'partial'">
            <span :class="[
              'text-xs px-2 py-1 rounded-full font-medium',
              row.payment_status === 'partial' ? 'bg-amber-100 text-amber-800' :
              row.is_overdue ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
            ]">
              {{ row.payment_status === 'partial' ? 'Parcial' : 'Crédito' }}
            </span>
          </template>
          <span v-else class="text-sm text-text-secondary">—</span>
        </template>

        <template #cell-status="{ value }">
          <span :class="['text-xs px-2 py-1 rounded-full font-medium', statusColors[value] || 'bg-gray-100 text-gray-800']">
            {{ statusLabels[value] || value }}
          </span>
        </template>

        <template #cell-invoice="{ row }">
          <button
            v-if="row.invoice_status === 'accepted'"
            @click.stop="openInvoicePanel(row)"
            class="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
            :aria-label="`Ver factura ${row.invoice_prefix}-${row.invoice_number}`"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m4.5 12.75 6 6 9-13.5" /></svg>
            {{ row.invoice_prefix }}-{{ row.invoice_number }}
          </button>
          <span v-else-if="row.invoice_status === 'pending'" class="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700">
            <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            Procesando
          </span>
          <span v-else-if="row.invoice_status === 'rejected'" class="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-700" :title="row.error_message || 'Rechazada por DIAN'">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
            Rechazada
          </span>
          <span v-else class="text-sm text-text-tertiary">—</span>
        </template>

        <template #cell-waros_earned="{ value }">
          <span v-if="value > 0" class="text-sm font-semibold text-amber-700">
            +{{ value.toLocaleString('es-CO') }}
          </span>
          <span v-else class="text-sm text-text-secondary">—</span>
        </template>
      </UiResponsiveDataView>

      <!-- Pagination -->
      <div v-if="totalOrders > perPage" class="bg-white px-4 py-3 flex items-center justify-between border border-titan-200 rounded-lg">
        <div class="flex-1 flex justify-between sm:hidden">
          <button @click="previousPage" :disabled="!canGoPrevious"
            :class="['relative inline-flex items-center px-4 py-2 border border-titan-300 text-sm font-medium rounded-md', canGoPrevious ? 'text-titan-700 bg-white hover:bg-titan-50' : 'text-titan-400 bg-titan-50 cursor-not-allowed']">
            Anterior
          </button>
          <button @click="nextPage" :disabled="!canGoNext"
            :class="['relative inline-flex items-center px-4 py-2 border border-titan-300 text-sm font-medium rounded-md', canGoNext ? 'text-titan-700 bg-white hover:bg-titan-50' : 'text-titan-400 bg-titan-50 cursor-not-allowed']">
            Siguiente
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <p class="text-sm text-titan-700">
            Mostrando <span class="font-medium">{{ startItem }}</span> a <span class="font-medium">{{ endItem }}</span>
            de <span class="font-medium">{{ totalOrders }}</span> pedidos
          </p>
          <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
            <button @click="previousPage" :disabled="!canGoPrevious"
              :class="['relative inline-flex items-center px-2 py-2 rounded-l-md border border-titan-300 text-sm font-medium', canGoPrevious ? 'text-titan-500 bg-white hover:bg-titan-50' : 'text-titan-300 bg-titan-50 cursor-not-allowed']">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span class="relative inline-flex items-center px-4 py-2 border border-titan-300 bg-white text-sm font-medium text-titan-700">
              {{ currentPage }} / {{ totalPages }}
            </span>
            <button @click="nextPage" :disabled="!canGoNext"
              :class="['relative inline-flex items-center px-2 py-2 rounded-r-md border border-titan-300 text-sm font-medium', canGoNext ? 'text-titan-500 bg-white hover:bg-titan-50' : 'text-titan-300 bg-titan-50 cursor-not-allowed']">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </nav>
        </div>
      </div>

    </div>

    <!-- Asignar Waros Modal -->
    <PuntosAsignarWarosModal
      v-if="customer"
      v-model="showWarosModal"
      :profile-id="customerId"
      :customer-name="customer.name"
      :current-balance="warosBalance"
      @assigned="onWarosAssigned"
    />

    <AnaliticaWalletRechargeModal
      v-if="customer"
      v-model="showWalletRechargeModal"
      :customer-id="customerId"
      :customer-name="customer.name"
      :current-balance="walletBalance"
      :payment-groups="walletPaymentGroups"
      :recharge="recharge"
      :on-open="resetRecharge"
      @recharged="onWalletRecharged"
    />

    <!-- Slide-over: asignaciones manuales -->
    <Teleport to="body">
      <!-- Overlay -->
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showManualPanel" class="fixed inset-0 z-40 bg-black/40" @click="showManualPanel = false" aria-hidden="true" />
      </Transition>

      <!-- Panel -->
      <Transition name="panel">
        <div
          v-if="showManualPanel"
          role="dialog"
          aria-modal="true"
          aria-label="Asignaciones manuales de Waros"
          class="fixed z-50 flex flex-col bg-surface shadow-2xl
                 inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
                 md:inset-y-0 md:right-0 md:bottom-auto md:left-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full"
        >
          <!-- Mobile drag handle -->
          <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
            <div class="w-10 h-1 rounded-full bg-slate-300" aria-hidden="true" />
          </div>

          <!-- Header -->
          <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700" aria-hidden="true">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div class="min-w-0">
                  <h2 class="text-base font-bold text-text-primary leading-tight">Asignaciones manuales</h2>
                  <p class="text-xs text-text-secondary leading-snug mt-0.5">{{ customer?.name }}</p>
                </div>
              </div>
              <button
                @click="showManualPanel = false"
                type="button"
                aria-label="Cerrar panel"
                class="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- List -->
          <div class="flex-1 overflow-y-auto px-6 py-4 space-y-2">
            <div
              v-if="!warosSummary?.manual_transactions?.length"
              class="flex flex-col items-center justify-center h-40 gap-2 text-text-secondary"
            >
              <svg class="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p class="text-sm font-medium">Sin asignaciones manuales</p>
            </div>
            <div
              v-for="tx in warosSummary?.manual_transactions"
              :key="tx.id"
              class="flex items-center justify-between gap-3 bg-white/70 border border-border/50 rounded-xl px-4 py-3"
            >
              <div class="min-w-0">
                <p class="text-xs text-text-secondary mb-0.5">{{ formatWarosDate(tx.created_at) }}</p>
                <p class="text-sm text-text-primary truncate">{{ tx.description || 'Asignación manual' }}</p>
              </div>
              <span
                :class="[
                  'text-sm font-bold flex-shrink-0',
                  tx.waros_amount > 0 ? 'text-green-600' : 'text-red-600',
                ]"
              >
                {{ tx.waros_amount > 0 ? '+' : '' }}{{ tx.waros_amount.toLocaleString('es-CO') }}
              </span>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Payment Registration Panel -->
    <Teleport to="body">
      <!-- Overlay -->
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showPaymentPanel" class="fixed inset-0 z-40 bg-black/40" @click="showPaymentPanel = false" aria-hidden="true" />
      </Transition>

      <!-- Panel -->
      <Transition name="panel">
        <div
          v-if="showPaymentPanel"
          role="dialog"
          aria-modal="true"
          aria-label="Registrar pago"
          class="fixed z-50 flex flex-col bg-surface shadow-2xl
                 inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
                 md:inset-y-0 md:right-0 md:bottom-auto md:left-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full"
        >
          <!-- Mobile drag handle -->
          <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
            <div class="w-10 h-1 rounded-full bg-slate-300" aria-hidden="true" />
          </div>

          <!-- Header -->
          <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600" aria-hidden="true">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div class="min-w-0">
                  <h2 class="text-base font-bold text-text-primary leading-tight">
                    {{ isGlobalPayment ? 'Abonar a cartera' : 'Registrar pago' }}
                  </h2>
                  <p class="text-xs text-text-secondary leading-snug mt-0.5">
                    <template v-if="isGlobalPayment">
                      Total pendiente · {{ formatCurrency(carteraData?.summary?.total_outstanding) }}
                    </template>
                    <template v-else>
                      Orden #{{ selectedOrder?.order_number }} · Resta {{ formatCurrency(selectedOrder?.remaining) }}
                    </template>
                  </p>
                </div>
              </div>
              <button
                @click="showPaymentPanel = false"
                type="button"
                aria-label="Cerrar panel"
                class="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Form -->
          <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <!-- FIFO note -->
            <div v-if="isGlobalPayment" class="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
              <svg class="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-xs text-blue-700">El monto se distribuye automáticamente a las órdenes más antiguas primero.</p>
            </div>

            <!-- Amount -->
            <div class="flex flex-col gap-1.5">
              <label for="payment-amount" class="text-sm font-medium text-text-primary">Monto a abonar</label>
              <input
                id="payment-amount"
                v-model.number="paymentForm.amount"
                type="number"
                min="1"
                :max="isGlobalPayment ? undefined : selectedOrder?.remaining"
                step="100"
                class="h-11 px-3 text-sm border-2 border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                placeholder="0"
              />
            </div>

            <!-- Payment method -->
            <div class="flex flex-col gap-1.5">
              <label for="payment-method" class="text-sm font-medium text-text-primary">Forma de pago</label>
              <select
                id="payment-method"
                v-model="paymentForm.payment_method"
                class="h-11 px-3 text-sm border-2 border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
              >
                <option v-for="group in paymentGroups" :key="group.slug" :value="group.slug">{{ group.name }}</option>
              </select>
            </div>

            <!-- Notes -->
            <div class="flex flex-col gap-1.5">
              <label for="payment-notes" class="text-sm font-medium text-text-primary">
                Notas <span class="text-text-secondary font-normal">(opcional)</span>
              </label>
              <textarea
                id="payment-notes"
                v-model="paymentForm.notes"
                rows="3"
                class="px-3 py-2 text-sm border-2 border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors resize-none"
                placeholder="Ej: Pago parcial acordado..."
              />
            </div>

            <!-- Error -->
            <p v-if="paymentError" class="text-sm text-red-600 flex items-center gap-1.5">
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ paymentError }}
            </p>
          </div>

          <!-- Footer -->
          <div class="flex-shrink-0 border-t border-border px-6 py-4">
            <button
              @click="submitPayment"
              :disabled="isSubmittingPayment || !paymentForm.amount || paymentForm.amount <= 0"
              class="w-full min-h-[44px] px-4 py-3 text-sm font-semibold rounded-lg bg-primary text-primary-foreground
                     hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30
                     disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isSubmittingPayment">Registrando...</span>
              <span v-else>Confirmar pago</span>
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Invoice Slideover Panel -->
    <Teleport to="body">
      <div v-if="showInvoicePanel" class="fixed inset-0 z-50 flex justify-end">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/40" @click="showInvoicePanel = false"></div>
        <!-- Panel -->
        <div class="relative bg-surface w-full max-w-xl shadow-xl flex flex-col h-full overflow-hidden">
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 class="text-lg font-bold text-text-primary">
              Factura {{ selectedInvoice?.prefix }}-{{ selectedInvoice?.number }}
            </h3>
            <button
              @click="showInvoicePanel = false"
              class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-surface-secondary transition-colors"
              aria-label="Cerrar panel de factura"
            >
              <svg class="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto p-6 space-y-4">
            <!-- CUFE -->
            <div v-if="selectedInvoice?.cufe" class="space-y-1">
              <p class="text-xs font-semibold text-text-tertiary uppercase tracking-wider">CUFE</p>
              <div class="flex items-start gap-2">
                <code class="text-xs text-text-secondary font-mono break-all flex-1 bg-surface-secondary rounded-lg p-2">{{ selectedInvoice.cufe }}</code>
                <button
                  @click="copyCufe(selectedInvoice.cufe)"
                  class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border hover:bg-surface-secondary transition-colors shrink-0"
                  :aria-label="copiedCufe ? 'CUFE copiado' : 'Copiar CUFE'"
                >
                  <svg v-if="!copiedCufe" class="w-4 h-4 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" /></svg>
                  <svg v-else class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m4.5 12.75 6 6 9-13.5" /></svg>
                </button>
              </div>
            </div>

            <!-- PDF preview -->
            <div class="space-y-2">
              <p class="text-xs font-semibold text-text-tertiary uppercase tracking-wider">PDF</p>
              <div v-if="invoicePdfLoading" class="flex items-center justify-center py-12">
                <svg class="h-6 w-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              </div>
              <iframe
                v-else-if="invoicePdfUrl"
                :src="invoicePdfUrl"
                class="w-full rounded-lg border border-border"
                style="height: 500px;"
                title="Vista previa PDF factura"
              ></iframe>
              <div v-else class="text-sm text-text-secondary text-center py-8">
                PDF no disponible
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
            <a
              v-if="invoicePdfUrl"
              :href="invoicePdfUrl"
              target="_blank"
              rel="noopener"
              class="min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
              Abrir en nueva pestaña
            </a>
            <button
              @click="showInvoicePanel = false"
              class="min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium bg-surface border border-border text-text-primary hover:bg-surface-secondary transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style>
/* Slide-over animation — same as EditarReglaModal */
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

.dp-custom-input {
  height: 40px !important;
  border: 2px solid hsl(var(--border)) !important;
  border-radius: 0.5rem !important;
  background: hsl(var(--background)) !important;
  font-size: 0.875rem !important;
  color: hsl(var(--foreground)) !important;
  padding-left: 0.75rem !important;
  padding-right: 0.75rem !important;
  min-width: 220px;
}
.dp-custom-input:focus {
  outline: none !important;
  border-color: hsl(var(--primary)) !important;
  box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2) !important;
}
.dp-custom-input::placeholder { color: hsl(var(--muted-foreground)) !important; }
.dp__theme_light {
  --dp-primary-color: hsl(var(--primary));
  --dp-primary-text-color: hsl(var(--primary-foreground));
  --dp-background-color: hsl(var(--card));
  --dp-text-color: hsl(var(--foreground));
  --dp-border-color: hsl(var(--border));
  --dp-menu-border-color: hsl(var(--border));
  --dp-hover-color: hsl(var(--accent));
  --dp-hover-text-color: hsl(var(--foreground));
  --dp-secondary-color: hsl(var(--muted));
  --dp-border-color-hover: hsl(var(--primary));
}
.dp-custom-menu {
  border-radius: 0.75rem !important;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) !important;
}
</style>
