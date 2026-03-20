<script setup lang="ts">
import { ref, computed, inject, onMounted, onUnmounted, watch } from 'vue';
import { es } from 'date-fns/locale';
import { format as fnsFormat } from 'date-fns';
import MetricCard from '~/components/shared/MetricCard.vue';
import type { WaroTransaction } from '~/composables/useWarosCliente';

definePageMeta({ layout: 'dashboard' })

const route = useRoute()
const router = useRouter()
const { currentTenant } = useTenantReactive()

const customerId = computed(() => route.params.id as string)

// ── Layout actions ────────────────────────────────────────────────────────
const setPageTitle = inject<(title: string | undefined) => void>('setPageTitle')
const setPageSubtitle = inject<(subtitle: string | undefined) => void>('setPageSubtitle')
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
  const from = fnsFormat(dates[0], 'dd/MM/yyyy', { locale: es })
  if (!dates[1]) return from
  return `${from} - ${fnsFormat(dates[1], 'dd/MM/yyyy', { locale: es })}`
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

const paymentLabels: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  digital: 'Digital',
}
const formatPayment = (method: string) => paymentLabels[method] || method || '-'

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
  { key: 'status', title: 'Estado', sortable: false },
]

// ── Waros ─────────────────────────────────────────────────────────────────
const { summary: warosSummary, isLoadingSummary: isLoadingWaros, fetchSummary: fetchWarosSummary } = useWarosCliente()
const showWarosModal = ref(false)
const warosBalance = computed(() => warosSummary.value?.current_balance ?? 0)

const onWarosAssigned = async (payload: { newBalance: number }) => {
  // Update local balance immediately then refetch for accurate transaction list
  if (warosSummary.value) warosSummary.value.current_balance = payload.newBalance
  await fetchWarosSummary(customerId.value)
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

// ── Layout wiring ─────────────────────────────────────────────────────────
watch(customer, (c) => {
  if (c) setPageTitle?.(c.name)
}, { immediate: true })

watch(currentTenant, () => {
  if (customerId.value) fetchWarosSummary(customerId.value)
})

onMounted(() => {
  setShowBackButton?.(true)
  setBackHandler?.(goBack)
  fetchWarosSummary(customerId.value)
})

onUnmounted(() => {
  setPageTitle?.(undefined)
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
            <!-- Total comprado (prominent, right) -->
            <div class="text-left sm:text-right flex-shrink-0">
              <p class="text-2xl sm:text-3xl font-bold text-text-primary">{{ formatCurrency(customer.total_spent) }}</p>
              <p class="text-xs text-text-secondary uppercase tracking-wider font-medium mt-0.5">Total comprado</p>
            </div>
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
          <!-- Balance row -->
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-2">
              <span aria-hidden="true" class="text-lg">🪙</span>
              <div>
                <p class="text-xs text-text-secondary uppercase tracking-wider font-medium">Waros</p>
                <p v-if="isLoadingWaros" class="text-sm font-semibold text-text-secondary">Cargando...</p>
                <p v-else class="text-sm font-semibold text-amber-700">
                  {{ warosBalance.toLocaleString('es-CO') }} Waros
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Asignar o quitar Waros a este cliente"
              @click="showWarosModal = true"
              class="min-h-[44px] px-4 text-sm font-semibold rounded-lg border-2 border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400/50 flex-shrink-0"
            >
              + Asignar puntos
            </button>
          </div>

          <!-- Last transactions -->
          <div
            v-if="!isLoadingWaros && warosSummary && warosSummary.recent_transactions.length > 0"
            class="mt-3 space-y-1"
          >
            <p class="text-xs text-text-secondary uppercase tracking-wider font-medium mb-2">Últimas transacciones</p>
            <div
              v-for="tx in warosSummary.recent_transactions"
              :key="tx.id"
              class="flex items-center justify-between gap-3 py-1"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span
                  :class="[
                    'text-xs font-bold flex-shrink-0 w-14 text-right',
                    tx.waros_amount > 0 ? 'text-green-600' : 'text-red-600'
                  ]"
                >
                  {{ tx.waros_amount > 0 ? '+' : '' }}{{ tx.waros_amount.toLocaleString('es-CO') }}
                </span>
                <span class="text-xs font-medium text-text-secondary flex-shrink-0">{{ txTypeLabel(tx.transaction_type) }}</span>
                <span class="text-xs text-text-secondary truncate">{{ tx.description }}</span>
              </div>
              <span class="text-xs text-text-secondary flex-shrink-0">{{ formatWarosDate(tx.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 gap-4">
        <MetricCard title="Total pedidos" :value="customer.total_orders" format="number" variant="primary" />
        <MetricCard title="Ticket promedio" :value="avgTicket" format="currency" variant="primary" />
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
              <span class="text-text-secondary">{{ item.items_count }} productos · {{ formatPayment(item.payment_method) }}</span>
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
          <span class="text-sm text-text-secondary">{{ formatPayment(value) }}</span>
        </template>

        <template #cell-status="{ value }">
          <span :class="['text-xs px-2 py-1 rounded-full font-medium', statusColors[value] || 'bg-gray-100 text-gray-800']">
            {{ statusLabels[value] || value }}
          </span>
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
  </div>
</template>

<style>
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
