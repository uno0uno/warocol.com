<script setup lang="ts">
import { ref, computed, reactive, inject, onMounted, onUnmounted, watch } from 'vue';
import { enUS, es } from 'date-fns/locale';
import MetricCard from '~/components/shared/MetricCard.vue';
import { resolvePaymentSelection } from '~/composables/usePaymentSelectValue';
import {
  PAYMENT_DEFAULTS,
  WALLET_PAYMENT_SLUG,
  mergePosPaymentGroupsFromApi,
  type ApiPaymentGroup,
} from '~/utils/paymentDefaults';

definePageMeta({ layout: 'dashboard', module: 'crm' })

const route = useRoute()
const router = useRouter()
const { currentTenant } = useTenantReactive()
const { t, locale } = useI18n({ useScope: 'global' })

const customerId = computed(() => route.params.id as string)

// Payment groups for the payment form select
const { data: paymentGroupsData } = useQuery({
  key: () => ['payments', 'pos-methods', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: ApiPaymentGroup[] }>('/api/pos/payment-methods'),
  enabled: () => !!currentTenant.value,
  staleTime: 300_000,
})
const paymentGroups = computed(() =>
  mergePosPaymentGroupsFromApi(paymentGroupsData.value?.data ?? []),
)
const { resolveLabel } = usePaymentLabel(paymentGroups)
const carteraPaymentGroups = computed(() =>
  paymentGroups.value.filter(
    group => group.slug !== 'credit' && group.slug !== WALLET_PAYMENT_SLUG,
  ),
)

// ── Layout actions ────────────────────────────────────────────────────────
const setShowBackButton = inject<(show: boolean) => void>('setShowBackButton')
const setBackHandler = inject<(handler: (() => void) | undefined) => void>('setBackHandler')

const goBack = () => router.push('/crm/clientes')

// ── Filters ───────────────────────────────────────────────────────────────
const { dateRangeDates, presetDates, maxDate, formatDateRange, dateRange } = useDateRangePresets()
const { timezone } = useTenantTimezone()
const { formatCalendarDate, formatDate: formatTenantDate, formatCurrency, formatNumber } = useFormatters()
const dateFnsLocale = computed(() => toDateFnsLocale(locale.value))

// ── Pagination (match ventas/ordenes UI; max 10 rows per table) ───────────
const TABLE_PAGE_SIZE = 10
const ordersPage = ref(1)
const walletPage = ref(1)
const carteraPage = ref(1)

// ── Data fetch ────────────────────────────────────────────────────────────
const { data: apiData, pending: isLoading, error: fetchError, refresh } = useAsyncData(
  `customer-detail-${customerId.value}`,
  () => $fetch(`/api/orders/customers/${customerId.value}`, {
    params: {
      date_from: dateRange.value.from || undefined,
      date_to: dateRange.value.to || undefined,
      page: ordersPage.value,
      per_page: TABLE_PAGE_SIZE,
    }
  }),
  {
    server: false,
    watch: [currentTenant, dateRangeDates, ordersPage],
  }
)

const customer = computed(() => (apiData.value as any)?.customer || null)
const realEmail = computed(() => {
  const email = customer.value?.email
  if (!email || email.endsWith('@customer.temp')) return null
  return email
})
const hasFiscalInfo = computed(() => {
  const c = customer.value
  if (!c) return false
  const hasDocument = !!(c.fiscal_id_type && c.fiscal_id)
  return !!(hasDocument || c.fiscal_business_name || c.fiscal_email)
})
const fiscalDocumentLabel = computed(() => {
  const c = customer.value
  if (!c?.fiscal_id_type || !c?.fiscal_id) return null
  return `${c.fiscal_id_type} ${c.fiscal_id}`
})
const avgTicket = computed(() => {
  const c = customer.value
  if (!c || !c.total_orders) return 0
  return c.total_spent / c.total_orders
})
const ordersData = computed(() => (apiData.value as any)?.orders || { items: [], total: 0, page: 1, per_page: TABLE_PAGE_SIZE })
const orders = computed(() => ordersData.value?.items || [])
const totalOrders = computed(() => ordersData.value?.total || 0)
const ordersTotalPages = computed(() => Math.max(1, Math.ceil(totalOrders.value / TABLE_PAGE_SIZE)))
const goToOrdersPage = (page: number) => {
  const next = Math.min(Math.max(1, page), ordersTotalPages.value)
  if (next !== ordersPage.value) ordersPage.value = next
}

// ── Helpers ───────────────────────────────────────────────────────────────
const formatDate = (isoDate: string) => {
  if (!isoDate) return '-'
  try {
    return /^\d{4}-\d{2}-\d{2}$/.test(isoDate)
      ? formatCalendarDate(isoDate)
      : formatTenantDate(isoDate)
  }
  catch { return isoDate }
}

const formatWaros = (value: number) => formatNumber(value || 0, { maximumFractionDigits: 0 })
const formatProductCount = (count: number) =>
  t(count === 1 ? 'analitica.customerDetail.productCountOne' : 'analitica.customerDetail.productCountMany', { count })
const formatManualWarosDescription = (description: string | null | undefined) => {
  const value = (description || '').trim()
  if (!value) return t('analitica.customerDetail.waros.manualAssignment')
  if (value === 'Asignación manual de Waros') return t('analitica.customerDetail.waros.manualCredit')
  if (value === 'Deducción manual de Waros') return t('analitica.customerDetail.waros.manualDebit')
  return value
}

const statusLabel = (status: string) =>
  ['completed', 'cancelled', 'pending'].includes(status)
    ? t(`analitica.customerDetail.status.${status}`)
    : status
const creditStatusLabel = (isOverdue: boolean) =>
  t(isOverdue ? 'analitica.customerDetail.credit.overdue' : 'analitica.customerDetail.credit.current')
const paymentStatusLabel = (status: string) =>
  status === 'partial'
    ? t('analitica.customerDetail.paymentStatus.partial')
    : t('analitica.customerDetail.paymentStatus.credit')
const walletMovementLabel = (type: string) => {
  const keyByType: Record<string, string> = {
    receive: 'analitica.customerDetail.wallet.movementReceive',
    recharge: 'analitica.customerDetail.wallet.movementRecharge',
    apply: 'analitica.customerDetail.wallet.movementApply',
    redeem: 'analitica.customerDetail.wallet.movementRedeem',
    refund: 'analitica.customerDetail.wallet.movementRefund',
    void_apply: 'analitica.customerDetail.wallet.movementVoidApply',
  }
  const key = keyByType[type]
  return key ? t(key) : type
}
const orderStatusVariant = (status: string) =>
  status === 'completed' ? 'success' : status === 'cancelled' ? 'destructive' : 'warning'

// ── Actions ───────────────────────────────────────────────────────────────
const clearFilters = () => { dateRangeDates.value = null; ordersPage.value = 1 }

watch(dateRangeDates, () => { ordersPage.value = 1 })

// ── Table columns ─────────────────────────────────────────────────────────
const tableColumns = computed(() => [
  { key: 'order_number', title: t('analitica.customerDetail.orderNumber'), sortable: false },
  { key: 'date', title: t('analitica.common.date'), sortable: false },
  { key: 'items_count', title: t('analitica.customerDetail.productsCount'), sortable: false },
  { key: 'total', title: t('analitica.customerDetail.total'), sortable: false },
  { key: 'payment_method', title: t('analitica.customerDetail.paymentMethod'), sortable: false },
  { key: 'payment_status', title: t('analitica.customerDetail.credit.title'), sortable: false },
  { key: 'invoice', title: t('analitica.customerDetail.invoice'), sortable: false },
  { key: 'status', title: t('analitica.customerDetail.status.title'), sortable: false },
  { key: 'waros_earned', title: t('analitica.clientes.waros'), sortable: false },
])

const carteraColumns = computed(() => [
  { key: 'order_number', title: t('analitica.customerDetail.orderNumberAlt'), sortable: false },
  { key: 'date', title: t('analitica.common.date'), sortable: false },
  { key: 'total_amount', title: t('analitica.customerDetail.total'), sortable: false, align: 'right' as const },
  { key: 'credit_paid_amount', title: t('analitica.customerDetail.credit.paid'), sortable: false, align: 'right' as const },
  { key: 'remaining', title: t('analitica.customerDetail.credit.remaining'), sortable: false, align: 'right' as const },
  { key: 'due_date', title: t('analitica.customerDetail.credit.due'), sortable: false },
  { key: 'status_badge', title: t('analitica.customerDetail.status.title'), sortable: false },
  { key: 'cartera_actions', title: '', sortable: false, align: 'right' as const },
])

const walletColumns = computed(() => [
  { key: 'movement_type', title: t('analitica.customerDetail.wallet.colType'), sortable: false },
  { key: 'created_at', title: t('analitica.common.date'), sortable: false },
  { key: 'amount_cop', title: t('analitica.customerDetail.wallet.colAmount'), sortable: false, align: 'right' as const },
  { key: 'balance_after_cop', title: t('analitica.customerDetail.wallet.colBalanceAfter'), sortable: false, align: 'right' as const },
])

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
    editError.value = err?.data?.detail || t('analitica.customerDetail.editError')
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
const walletTotal = computed(() => walletMovements.value.length)
const walletTotalPages = computed(() => Math.max(1, Math.ceil(walletTotal.value / TABLE_PAGE_SIZE)))
const walletPageItems = computed(() => {
  const start = (walletPage.value - 1) * TABLE_PAGE_SIZE
  return walletMovements.value.slice(start, start + TABLE_PAGE_SIZE)
})
const goToWalletPage = (page: number) => {
  const next = Math.min(Math.max(1, page), walletTotalPages.value)
  if (next !== walletPage.value) walletPage.value = next
}
watch(walletMovements, () => { walletPage.value = 1 })

const walletPaymentGroups = computed(() => {
  const groups = paymentGroups.value.filter(
    g => g.slug !== 'credit' && g.slug !== WALLET_PAYMENT_SLUG,
  )
  if (groups.length) return groups
  return PAYMENT_DEFAULTS.filter(
    g => g.slug !== 'credit' && g.slug !== WALLET_PAYMENT_SLUG,
  )
})

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
  try { return formatTenantDate(isoDate) }
  catch { return isoDate }
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
    carteraPage.value = 1
  } catch {
    // Non-critical — cartera section hidden on error
  } finally {
    isLoadingCartera.value = false
  }
}

const carteraOrdersAll = computed(() => carteraData.value?.orders || [])
const carteraTotal = computed(() => carteraOrdersAll.value.length)
const carteraTotalPages = computed(() => Math.max(1, Math.ceil(carteraTotal.value / TABLE_PAGE_SIZE)))
const carteraPageItems = computed(() => {
  const start = (carteraPage.value - 1) * TABLE_PAGE_SIZE
  return carteraOrdersAll.value.slice(start, start + TABLE_PAGE_SIZE)
})
const goToCarteraPage = (page: number) => {
  const next = Math.min(Math.max(1, page), carteraTotalPages.value)
  if (next !== carteraPage.value) carteraPage.value = next
}

const showPaymentPanel = ref(false)
const selectedOrder = ref<any>(null)
const isGlobalPayment = ref(false)
const paymentForm = reactive({
  amount: 0,
  payment_method: 'cash',
  payment_method_id: null as string | null,
  notes: '',
})
const isSubmittingPayment = ref(false)
const paymentError = ref<string | null>(null)
const paymentSelectValue = computed({
  get: () => `${paymentForm.payment_method}:${paymentForm.payment_method_id ?? ''}`,
  set: (value: string) => {
    const resolved = resolvePaymentSelection(value, carteraPaymentGroups.value)
    paymentForm.payment_method = resolved.payment_method
    paymentForm.payment_method_id = resolved.payment_method_id
  },
})

const openPaymentPanel = (order: any) => {
  isGlobalPayment.value = false
  selectedOrder.value = order
  paymentForm.amount = order.remaining ?? order.total_amount
  paymentForm.payment_method = 'cash'
  paymentForm.payment_method_id = null
  paymentForm.notes = ''
  paymentError.value = null
  showPaymentPanel.value = true
}

const openGlobalPaymentPanel = () => {
  isGlobalPayment.value = true
  selectedOrder.value = null
  paymentForm.amount = carteraData.value?.summary?.total_outstanding ?? 0
  paymentForm.payment_method = 'cash'
  paymentForm.payment_method_id = null
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
          body: {
            amount: toPay,
            payment_method: paymentForm.payment_method,
            payment_method_id: paymentForm.payment_method_id || undefined,
            notes: paymentForm.notes || undefined,
          }
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
          payment_method_id: paymentForm.payment_method_id || undefined,
          notes: paymentForm.notes || undefined,
        }
      })
    }
    showPaymentPanel.value = false
    await fetchCartera()
  } catch (err: any) {
    paymentError.value = err?.data?.detail || t('analitica.customerDetail.credit.paymentError')
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
      <p class="text-xl font-semibold text-text-primary">{{ t('analitica.customerDetail.notFound') }}</p>
      <p class="text-sm text-text-secondary">{{ (fetchError as any)?.message || t('analitica.customerDetail.notFoundSub') }}</p>
      <button @click="goBack" class="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors min-h-[44px]">
        {{ t('analitica.customerDetail.backToCustomers') }}
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
                <p class="text-xs text-text-secondary uppercase tracking-wider font-medium mt-0.5">{{ t('analitica.customerDetail.posCustomer') }}</p>
              </div>
            </div>
            <!-- Total purchased + edit button -->
            <div class="flex items-center gap-3 flex-shrink-0">
              <div class="text-start sm:text-end">
                <p class="text-2xl sm:text-3xl font-bold text-text-primary">{{ formatCurrency(customer.total_spent) }}</p>
                <p class="text-xs text-text-secondary uppercase tracking-wider font-medium mt-0.5">{{ t('analitica.clientes.totalBought') }}</p>
              </div>
              <button
                type="button"
                :aria-label="t('analitica.customerDetail.editCustomer')"
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
          <p class="text-xs text-text-secondary uppercase tracking-wider font-medium mb-3">{{ t('analitica.customerDetail.editCustomer') }}</p>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="flex flex-col gap-1">
              <label for="edit-name" class="text-xs font-medium text-text-secondary">{{ t('analitica.clientes.name') }}</label>
              <input
                id="edit-name"
                v-model="editForm.name"
                type="text"
                :placeholder="t('analitica.clientes.fullName')"
                :disabled="isSavingEdit"
                class="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label for="edit-phone" class="text-xs font-medium text-text-secondary">{{ t('analitica.clientes.phone') }}</label>
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
              <label for="edit-email" class="text-xs font-medium text-text-secondary">{{ t('analitica.customerDetail.emailAddress') }}</label>
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
              {{ isSavingEdit ? t('analitica.customerDetail.saving') : t('common.save') }}
            </button>
            <button
              type="button"
              @click="showEditForm = false"
              :disabled="isSavingEdit"
              class="min-h-[44px] px-5 py-2 bg-surface border border-border text-sm font-medium text-text-secondary rounded-lg hover:bg-surface-secondary active:scale-95 transition-all disabled:opacity-50"
            >
              {{ t('common.cancel') }}
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
              <p class="text-xs text-text-secondary uppercase tracking-wider font-medium">{{ t('analitica.clientes.phone') }}</p>
            </div>
            <p class="text-sm font-semibold text-text-primary">{{ customer.phone || '-' }}</p>
          </div>
          <!-- Email -->
          <div class="p-4 border-b sm:border-b-0 sm:border-r border-border">
            <div class="flex items-center gap-1.5 mb-1.5">
              <svg class="w-3.5 h-3.5 text-text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p class="text-xs text-text-secondary uppercase tracking-wider font-medium">{{ t('analitica.clientes.email') }}</p>
            </div>
            <p class="text-sm font-semibold text-text-primary truncate">{{ realEmail || '-' }}</p>
          </div>
          <!-- First purchase -->
          <div class="p-4 border-r border-border">
            <div class="flex items-center gap-1.5 mb-1.5">
              <svg class="w-3.5 h-3.5 text-text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p class="text-xs text-text-secondary uppercase tracking-wider font-medium">{{ t('analitica.customerDetail.firstPurchase') }}</p>
            </div>
            <p class="text-sm font-semibold text-text-primary">{{ formatDate(customer.first_purchase) }}</p>
          </div>
          <!-- Last purchase -->
          <div class="p-4">
            <div class="flex items-center gap-1.5 mb-1.5">
              <svg class="w-3.5 h-3.5 text-text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-xs text-text-secondary uppercase tracking-wider font-medium">{{ t('analitica.customerDetail.lastPurchase') }}</p>
            </div>
            <p class="text-sm font-semibold text-text-primary">{{ formatDate(customer.last_purchase) }}</p>
          </div>
        </div>

        <!-- Fiscal info (only when present) -->
        <div v-if="hasFiscalInfo" class="border-t border-border px-5 py-4">
          <p class="text-xs text-text-secondary uppercase tracking-wider font-medium mb-3">{{ t('analitica.customerDetail.fiscalInfo') }}</p>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div v-if="fiscalDocumentLabel">
              <p class="text-xs text-text-secondary mb-0.5">{{ t('analitica.customerDetail.fiscalDocument') }}</p>
              <p class="text-sm font-semibold text-text-primary">{{ fiscalDocumentLabel }}</p>
            </div>
            <div v-if="customer.fiscal_business_name">
              <p class="text-xs text-text-secondary mb-0.5">{{ t('analitica.customerDetail.fiscalBusinessName') }}</p>
              <p class="text-sm font-semibold text-text-primary">{{ customer.fiscal_business_name }}</p>
            </div>
            <div v-if="customer.fiscal_email">
              <p class="text-xs text-text-secondary mb-0.5">{{ t('analitica.customerDetail.fiscalEmail') }}</p>
              <p class="text-sm font-semibold text-text-primary truncate">{{ customer.fiscal_email }}</p>
            </div>
          </div>
        </div>

        <!-- Waros section -->
        <div class="border-t border-border px-5 py-4">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-xs text-text-secondary uppercase tracking-wider font-medium mb-0.5">{{ t('analitica.customerDetail.waros.points') }}</p>
              <p v-if="isLoadingWaros" class="text-sm font-semibold text-text-secondary">{{ t('common.loading') }}</p>
              <p v-else class="text-sm font-semibold text-amber-700">{{ formatWaros(warosBalance) }}</p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <button
                v-if="!isLoadingWaros && warosSummary?.manual_transactions?.length > 0"
                type="button"
                :aria-label="t('analitica.customerDetail.waros.viewManualAria')"
                @click="showManualPanel = true"
                class="min-h-[44px] px-3 text-sm font-medium rounded-lg border border-border text-text-secondary hover:bg-surface-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {{ t('analitica.customerDetail.waros.viewManual') }}
              </button>
              <button
                type="button"
                :aria-label="t('analitica.customerDetail.waros.assignAria')"
                @click="showWarosModal = true"
                class="min-h-[44px] px-4 text-sm font-semibold rounded-lg border-2 border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              >
                {{ t('analitica.customerDetail.waros.assign') }}
              </button>
            </div>
          </div>
        </div>

      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 gap-4">
        <MetricCard :title="t('analitica.customerDetail.totalOrders')" :value="customer.total_orders" format="number" variant="primary" />
        <MetricCard :title="t('analitica.clientes.avgTicket')" :value="avgTicket" format="currency" variant="primary" />
      </div>

      <!-- Wallet COP Section -->
      <div class="bg-white border border-border rounded-xl overflow-hidden">
        <div class="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
          <div class="min-w-0">
            <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">
              {{ t('analitica.customerDetail.wallet.title') }}
            </h3>
            <p v-if="isLoadingWallet" class="text-sm text-text-secondary mt-0.5">{{ t('common.loading') }}</p>
            <p v-else-if="walletLoadError" class="text-sm font-semibold text-red-600 mt-0.5">{{ t('analitica.customerDetail.wallet.loadError') }}</p>
            <p v-else class="text-lg font-bold text-primary mt-0.5 tabular-nums">{{ formatCurrency(walletBalance) }}</p>
          </div>
          <button
            type="button"
            :aria-label="t('analitica.customerDetail.wallet.rechargeAria')"
            @click="showWalletRechargeModal = true"
            class="min-h-[36px] px-3 text-xs font-semibold rounded-lg bg-surface-secondary border-0 text-primary hover:bg-surface-secondary/80 transition-all focus:outline-none focus:ring-2 focus:ring-ring shrink-0"
          >
            {{ t('analitica.customerDetail.wallet.recharge') }}
          </button>
        </div>
        <UiResponsiveDataView
          v-if="!isLoadingWallet"
          row-size="sm"
          :columns="walletColumns"
          :data="walletPageItems"
          :empty-message="t('analitica.customerDetail.wallet.empty')"
          variant="default"
        >
          <template #card="{ item }">
            <div class="p-4 border-b border-border">
              <div class="flex justify-between items-start gap-3">
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-text-primary">{{ walletMovementLabel(item.movement_type) }}</p>
                  <p class="text-xs text-text-secondary mt-0.5">{{ formatDate(item.created_at) }}</p>
                </div>
                <span
                  :class="[
                    'text-sm font-semibold flex-shrink-0 tabular-nums',
                    item.amount_cop >= 0 ? 'text-green-700' : 'text-red-600',
                  ]"
                >
                  {{ item.amount_cop >= 0 ? '+' : '−' }}{{ formatCurrency(Math.abs(item.amount_cop)) }}
                </span>
              </div>
              <p class="text-xs text-text-secondary mt-2 tabular-nums">
                {{ t('analitica.customerDetail.wallet.colBalanceAfter') }}:
                {{ formatCurrency(item.balance_after_cop) }}
              </p>
            </div>
          </template>
          <template #cell-movement_type="{ value }">
            <span class="text-sm font-medium text-text-primary">{{ walletMovementLabel(value) }}</span>
          </template>
          <template #cell-created_at="{ value }">
            <span class="text-sm text-text-secondary">{{ formatDate(value) }}</span>
          </template>
          <template #cell-amount_cop="{ value }">
            <span
              :class="[
                'text-sm font-semibold tabular-nums',
                value >= 0 ? 'text-green-700' : 'text-red-600',
              ]"
            >
              {{ value >= 0 ? '+' : '−' }}{{ formatCurrency(Math.abs(value)) }}
            </span>
          </template>
          <template #cell-balance_after_cop="{ value }">
            <span class="text-sm text-text-primary tabular-nums">{{ formatCurrency(value) }}</span>
          </template>
        </UiResponsiveDataView>
        <div v-if="walletTotal > 0" class="flex items-center justify-end px-4 py-2 border-t border-border">
          <div class="flex items-center gap-1">
            <button
              type="button"
              :disabled="walletPage <= 1"
              @click="goToWalletPage(1)"
              class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              :aria-label="t('ventas.common.primeraPagina')"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
            </button>
            <button
              type="button"
              :disabled="walletPage <= 1"
              @click="goToWalletPage(walletPage - 1)"
              class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              :aria-label="t('ventas.common.paginaAnterior')"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span class="px-3 py-1 text-sm font-medium text-text-primary">{{ walletPage }}</span>
            <button
              type="button"
              :disabled="walletPage >= walletTotalPages"
              @click="goToWalletPage(walletPage + 1)"
              class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              :aria-label="t('ventas.common.paginaSiguiente')"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
            </button>
            <button
              type="button"
              :disabled="walletPage >= walletTotalPages"
              @click="goToWalletPage(walletTotalPages)"
              class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              :aria-label="t('ventas.common.ultimaPagina')"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Cartera Section -->
      <div v-if="carteraData && carteraData.summary?.total_outstanding > 0" class="bg-white border border-border rounded-xl overflow-hidden">
        <!-- Header -->
        <div class="px-5 py-4 border-b border-border flex items-center justify-between">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">{{ t('analitica.customerDetail.credit.title') }}</h3>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <span class="text-lg font-bold text-red-600 tabular-nums">{{ formatCurrency(carteraData.summary.total_outstanding) }}</span>
            <button
              @click="openGlobalPaymentPanel"
              class="min-h-[36px] px-3 text-xs font-semibold rounded-lg bg-surface-secondary border-0 text-primary hover:bg-surface-secondary/80 transition-all focus:outline-none focus:ring-2 focus:ring-ring"
              :aria-label="t('analitica.customerDetail.credit.payAllAria')"
            >
              {{ t('analitica.customerDetail.credit.payAll') }}
            </button>
          </div>
        </div>
        <!-- Summary strip -->
        <div class="grid grid-cols-3 divide-x divide-border border-b border-border">
          <div class="px-4 py-3">
            <p class="text-xs text-text-secondary uppercase tracking-wider font-medium mb-0.5">{{ t('analitica.customerDetail.credit.orders') }}</p>
            <p class="text-sm font-semibold text-text-primary tabular-nums">{{ carteraData.summary.order_count }}</p>
          </div>
          <div class="px-4 py-3">
            <p class="text-xs text-text-secondary uppercase tracking-wider font-medium mb-0.5">{{ t('analitica.customerDetail.credit.overduePlural') }}</p>
            <p class="text-sm font-semibold tabular-nums" :class="carteraData.summary.overdue_count > 0 ? 'text-red-600' : 'text-text-secondary'">
              {{ carteraData.summary.overdue_count }}
            </p>
          </div>
          <div class="px-4 py-3">
            <p class="text-xs text-text-secondary uppercase tracking-wider font-medium mb-0.5">{{ t('analitica.customerDetail.credit.overdueAmount') }}</p>
            <p class="text-sm font-semibold tabular-nums" :class="carteraData.summary.overdue_amount > 0 ? 'text-red-600' : 'text-text-secondary'">
              {{ formatCurrency(carteraData.summary.overdue_amount) }}
            </p>
          </div>
        </div>
        <!-- Credit orders list -->
        <UiResponsiveDataView
          row-size="sm"
          :columns="carteraColumns"
          :data="carteraPageItems"
          :empty-message="t('analitica.customerDetail.credit.empty')"
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
                <UiStatusBadge
                  :value="creditStatusLabel(item.is_overdue)"
                  format="text"
                  :variant="item.is_overdue ? 'destructive' : 'success'"
                  size="sm"
                />
              </div>
              <div class="text-sm text-text-secondary mb-3">
                {{ t('analitica.customerDetail.credit.remainingOf', { remaining: formatCurrency(item.remaining), total: formatCurrency(item.total_amount) }) }}
                <span v-if="item.due_date"> · {{ t('analitica.customerDetail.credit.dueOn', { date: formatDate(item.due_date) }) }}</span>
              </div>
              <button
                @click="openPaymentPanel(item)"
                class="w-full min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg bg-surface-secondary border-0 text-primary hover:bg-surface-secondary/80 transition-all focus:outline-none focus:ring-2 focus:ring-ring"
                :aria-label="t('analitica.customerDetail.credit.registerPaymentFor', { order: item.order_number })"
              >
                {{ t('analitica.customerDetail.credit.registerPayment') }}
              </button>
            </div>
          </template>
          <!-- Desktop cells -->
          <template #cell-order_number="{ value }"><span class="text-sm font-medium">#{{ value }}</span></template>
          <template #cell-date="{ value }"><span class="text-sm text-text-secondary">{{ formatDate(value) }}</span></template>
          <template #cell-total_amount="{ value }"><span class="text-sm tabular-nums">{{ formatCurrency(value) }}</span></template>
          <template #cell-credit_paid_amount="{ value }">
            <span
              :class="[
                'text-sm tabular-nums',
                Number(value) > 0 ? 'text-green-700' : 'text-text-secondary',
              ]"
            >{{ formatCurrency(value) }}</span>
          </template>
          <template #cell-remaining="{ value }"><span class="text-sm font-semibold text-text-primary tabular-nums">{{ formatCurrency(value) }}</span></template>
          <template #cell-due_date="{ value }">
            <span v-if="value" class="text-sm text-text-secondary">{{ formatDate(value) }}</span>
            <UiStatusBadge
              v-else
              :value="t('analitica.customerDetail.credit.noDueDate')"
              format="text"
              variant="secondary"
              size="sm"
            />
          </template>
          <template #cell-status_badge="{ row }">
            <UiStatusBadge
              :value="creditStatusLabel(row.is_overdue)"
              format="text"
              :variant="row.is_overdue ? 'destructive' : 'success'"
              size="sm"
            />
          </template>
          <template #cell-cartera_actions="{ row }">
            <button
              @click="openPaymentPanel(row)"
              class="min-h-[36px] px-3 text-xs font-semibold rounded-lg bg-surface-secondary border-0 text-primary hover:bg-surface-secondary/80 transition-all focus:outline-none focus:ring-2 focus:ring-ring"
              :aria-label="t('analitica.customerDetail.credit.registerPaymentFor', { order: row.order_number })"
            >
              {{ t('analitica.customerDetail.credit.pay') }}
            </button>
          </template>
        </UiResponsiveDataView>
        <div v-if="carteraTotal > 0" class="flex items-center justify-end px-4 py-2 border-t border-border">
          <div class="flex items-center gap-1">
            <button
              type="button"
              :disabled="carteraPage <= 1"
              @click="goToCarteraPage(1)"
              class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              :aria-label="t('ventas.common.primeraPagina')"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
            </button>
            <button
              type="button"
              :disabled="carteraPage <= 1"
              @click="goToCarteraPage(carteraPage - 1)"
              class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              :aria-label="t('ventas.common.paginaAnterior')"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span class="px-3 py-1 text-sm font-medium text-text-primary">{{ carteraPage }}</span>
            <button
              type="button"
              :disabled="carteraPage >= carteraTotalPages"
              @click="goToCarteraPage(carteraPage + 1)"
              class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              :aria-label="t('ventas.common.paginaSiguiente')"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
            </button>
            <button
              type="button"
              :disabled="carteraPage >= carteraTotalPages"
              @click="goToCarteraPage(carteraTotalPages)"
              class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              :aria-label="t('ventas.common.ultimaPagina')"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Date Filter -->
      <ClientOnly>
        <div class="flex items-center gap-2 overflow-x-auto pb-1">
          <VueDatePicker
            v-model="dateRangeDates"
            range
            :preset-dates="presetDates"
            :enable-time-picker="false"
            :locale="dateFnsLocale"
            :placeholder="t('analitica.customerDetail.filterPeriod')"
            auto-apply
            :teleport="true"
            :timezone="timezone"
            :max-date="maxDate"
            :format="formatDateRange"
            input-class-name="dp-custom-input"
            menu-class-name="dp-custom-menu"
            calendar-cell-class-name="dp-custom-cell"
          />
          <button
            v-if="dateRangeDates"
            @click="clearFilters"
            class="h-10 px-3 rounded-lg border-2 border-slate-200 bg-white text-sm text-slate-500 hover:text-slate-700 hover:border-indigo-500 transition-colors"
            :title="t('analitica.common.clearFilters')"
            :aria-label="t('analitica.customerDetail.clearDateFilter')"
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
        :title="t('analitica.customerDetail.history.title')"
        :empty-message="t('analitica.customerDetail.history.empty')"
        :empty-sub-message="t('analitica.customerDetail.history.emptySub')"
        variant="default"
      >
        <template #header>
          <h3 class="text-base font-bold text-text-primary">
            {{ t('analitica.customerDetail.history.title') }}
            <span v-if="totalOrders > 0" class="ms-2 text-sm font-normal text-text-secondary">{{ t('analitica.customerDetail.history.total', { total: totalOrders }) }}</span>
          </h3>
        </template>

        <!-- Mobile Card -->
        <template #card="{ item }">
          <div class="bg-white border border-border rounded-lg p-4">
            <div class="flex justify-between items-start mb-2">
              <div>
                <NuxtLink
                  v-if="item.order_id"
                  :to="`/ventas/${item.order_id}`"
                  class="font-medium text-primary hover:underline"
                  :aria-label="`#${item.order_number}`"
                >
                  # {{ item.order_number }}
                </NuxtLink>
                <p v-else class="font-medium text-text-primary"># {{ item.order_number }}</p>
                <p class="text-sm text-text-secondary">{{ formatDate(item.date) }}</p>
              </div>
              <UiStatusBadge
                :value="statusLabel(item.status)"
                format="text"
                :variant="orderStatusVariant(item.status)"
                size="sm"
              />
            </div>
            <div class="flex justify-between items-center text-sm">
              <span class="text-text-secondary">{{ formatProductCount(item.items_count) }} · {{ resolveLabel(item.payment_method) }}</span>
              <span class="font-bold text-text-primary">{{ formatCurrency(item.total) }}</span>
            </div>
          </div>
        </template>

        <!-- Desktop Cells -->
        <template #cell-order_number="{ value, row }">
          <NuxtLink
            v-if="row.order_id"
            :to="`/ventas/${row.order_id}`"
            class="text-sm font-medium text-primary hover:underline"
            :aria-label="`#${value}`"
          >
            #{{ value }}
          </NuxtLink>
          <span v-else class="text-sm font-medium text-text-primary">#{{ value }}</span>
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
          <UiStatusBadge
            v-if="row.payment_status === 'credit' || row.payment_status === 'partial'"
            :value="paymentStatusLabel(row.payment_status)"
            format="text"
            :variant="row.payment_status === 'partial' ? 'warning' : (row.is_overdue ? 'destructive' : 'warning')"
            size="sm"
          />
          <UiStatusBadge
            v-else
            :value="t('analitica.customerDetail.credit.paid')"
            format="text"
            variant="success"
            size="sm"
          />
        </template>

        <template #cell-status="{ value }">
          <UiStatusBadge
            :value="statusLabel(value)"
            format="text"
            :variant="orderStatusVariant(value)"
            size="sm"
          />
        </template>

        <template #cell-invoice="{ row }">
          <button
            v-if="row.invoice_status === 'accepted'"
            @click.stop="openInvoicePanel(row)"
            class="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
            :aria-label="t('analitica.customerDetail.invoiceViewAria', { invoice: `${row.invoice_prefix}-${row.invoice_number}` })"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m4.5 12.75 6 6 9-13.5" /></svg>
            {{ row.invoice_prefix }}-{{ row.invoice_number }}
          </button>
          <UiStatusBadge
            v-else-if="row.invoice_status === 'pending'"
            :value="t('analitica.customerDetail.invoiceStatus.processing')"
            format="text"
            variant="warning"
            size="sm"
          />
          <span
            v-else-if="row.invoice_status === 'rejected'"
            :title="row.error_message || t('analitica.customerDetail.invoiceStatus.rejectedByDian')"
          >
            <UiStatusBadge
              :value="t('analitica.customerDetail.invoiceStatus.rejected')"
              format="text"
              variant="destructive"
              size="sm"
            />
          </span>
          <UiStatusBadge
            v-else
            :value="t('ventas.ordenes.sinFactura')"
            format="text"
            variant="secondary"
            size="sm"
          />
        </template>

        <template #cell-waros_earned="{ value }">
          <span v-if="value > 0" class="text-sm font-semibold text-amber-700">
            +{{ formatWaros(value) }}
          </span>
          <UiStatusBadge
            v-else
            :value="t('analitica.customerDetail.history.noWaros')"
            format="text"
            variant="secondary"
            size="sm"
          />
        </template>
      </UiResponsiveDataView>

      <!-- Pagination (match ventas/ordenes) -->
      <div v-if="totalOrders > 0" class="flex items-center justify-end px-1 py-2">
        <div class="flex items-center gap-1">
          <button
            type="button"
            :disabled="ordersPage <= 1"
            @click="goToOrdersPage(1)"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :aria-label="t('ventas.common.primeraPagina')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
          </button>
          <button
            type="button"
            :disabled="ordersPage <= 1"
            @click="goToOrdersPage(ordersPage - 1)"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :aria-label="t('ventas.common.paginaAnterior')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span class="px-3 py-1 text-sm font-medium text-text-primary">{{ ordersPage }}</span>
          <button
            type="button"
            :disabled="ordersPage >= ordersTotalPages"
            @click="goToOrdersPage(ordersPage + 1)"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :aria-label="t('ventas.common.paginaSiguiente')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </button>
          <button
            type="button"
            :disabled="ordersPage >= ordersTotalPages"
            @click="goToOrdersPage(ordersTotalPages)"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :aria-label="t('ventas.common.ultimaPagina')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
          </button>
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
          :aria-label="t('analitica.customerDetail.waros.manualAssignments')"
          class="fixed z-50 flex flex-col bg-surface shadow-2xl
                 inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
                 md:inset-y-0 md:end-0 md:bottom-auto md:start-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full"
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
                  <h2 class="text-base font-bold text-text-primary leading-tight">{{ t('analitica.customerDetail.waros.manualAssignments') }}</h2>
                  <p class="text-xs text-text-secondary leading-snug mt-0.5">{{ customer?.name }}</p>
                </div>
              </div>
              <button
                @click="showManualPanel = false"
                type="button"
                :aria-label="t('analitica.customerDetail.closePanel')"
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
              <p class="text-sm font-medium">{{ t('analitica.customerDetail.waros.noManualAssignments') }}</p>
            </div>
            <div
              v-for="tx in warosSummary?.manual_transactions"
              :key="tx.id"
              class="flex items-center justify-between gap-3 bg-white/70 border border-border/50 rounded-xl px-4 py-3"
            >
              <div class="min-w-0">
                <p class="text-xs text-text-secondary mb-0.5">{{ formatWarosDate(tx.created_at) }}</p>
                <p class="text-sm text-text-primary truncate">{{ formatManualWarosDescription(tx.description) }}</p>
              </div>
              <span
                :class="[
                  'text-sm font-bold flex-shrink-0',
                  tx.waros_amount > 0 ? 'text-green-600' : 'text-red-600',
                ]"
              >
                {{ tx.waros_amount > 0 ? '+' : '' }}{{ formatWaros(Math.abs(tx.waros_amount)) }}
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
          :aria-label="t('analitica.customerDetail.credit.registerPayment')"
          class="fixed z-50 flex flex-col bg-surface shadow-2xl
                 inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
                 md:inset-y-0 md:end-0 md:bottom-auto md:start-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full"
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
                    {{ isGlobalPayment ? t('analitica.customerDetail.credit.payAll') : t('analitica.customerDetail.credit.registerPayment') }}
                  </h2>
                  <p class="text-xs text-text-secondary leading-snug mt-0.5">
                    <template v-if="isGlobalPayment">
                      {{ t('analitica.customerDetail.credit.totalPending', { amount: formatCurrency(carteraData?.summary?.total_outstanding) }) }}
                    </template>
                    <template v-else>
                      {{ t('analitica.customerDetail.credit.orderRemaining', { order: selectedOrder?.order_number, amount: formatCurrency(selectedOrder?.remaining) }) }}
                    </template>
                  </p>
                </div>
              </div>
              <button
                @click="showPaymentPanel = false"
                type="button"
                :aria-label="t('analitica.customerDetail.closePanel')"
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
              <p class="text-xs text-blue-700">{{ t('analitica.customerDetail.credit.fifoNote') }}</p>
            </div>

            <!-- Amount -->
            <div class="flex flex-col gap-1.5">
              <label for="payment-amount" class="text-sm font-medium text-text-primary">{{ t('analitica.customerDetail.credit.amountToPay') }}</label>
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
              <label for="payment-method" class="text-sm font-medium text-text-primary">{{ t('analitica.customerDetail.paymentMethod') }}</label>
              <select
                id="payment-method"
                v-model="paymentSelectValue"
                class="h-11 px-3 text-sm border-2 border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                :disabled="isSubmittingPayment"
              >
                <template v-for="group in carteraPaymentGroups" :key="group.id">
                  <option v-if="!(group.methods?.length)" :value="`${group.slug}:`">{{ group.name }}</option>
                  <optgroup v-else :label="group.name">
                    <option
                      v-for="method in group.methods"
                      :key="method.id"
                      :value="`${group.slug}:${method.id}`"
                    >
                      {{ method.name }}
                    </option>
                  </optgroup>
                </template>
              </select>
            </div>

            <!-- Notes -->
            <div class="flex flex-col gap-1.5">
              <label for="payment-notes" class="text-sm font-medium text-text-primary">
                {{ t('analitica.customerDetail.notes') }} <span class="text-text-secondary font-normal">{{ t('analitica.customerDetail.optional') }}</span>
              </label>
              <textarea
                id="payment-notes"
                v-model="paymentForm.notes"
                rows="3"
                class="px-3 py-2 text-sm border-2 border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors resize-none"
                :placeholder="t('analitica.customerDetail.credit.notesPlaceholder')"
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
              <span v-if="isSubmittingPayment">{{ t('analitica.customerDetail.registering') }}</span>
              <span v-else>{{ t('analitica.customerDetail.credit.confirmPayment') }}</span>
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
              {{ t('analitica.customerDetail.invoiceTitle', { invoice: `${selectedInvoice?.prefix}-${selectedInvoice?.number}` }) }}
            </h3>
            <button
              @click="showInvoicePanel = false"
              class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-surface-secondary transition-colors"
              :aria-label="t('analitica.customerDetail.invoiceClosePanel')"
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
                  :aria-label="copiedCufe ? t('analitica.customerDetail.cufeCopied') : t('analitica.customerDetail.copyCufe')"
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
                :title="t('analitica.customerDetail.invoicePdfPreview')"
              ></iframe>
              <div v-else class="text-sm text-text-secondary text-center py-8">
                {{ t('analitica.customerDetail.invoicePdfUnavailable') }}
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
              {{ t('analitica.customerDetail.openNewTab') }}
            </a>
            <button
              @click="showInvoicePanel = false"
              class="min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium bg-surface border border-border text-text-primary hover:bg-surface-secondary transition-colors"
            >
              {{ t('common.close') }}
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
