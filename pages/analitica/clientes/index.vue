<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useDebounceFn } from '@vueuse/core'
import { es } from 'date-fns/locale';
import { format as fnsFormat, formatDistanceToNow } from 'date-fns';
import MetricCard from '~/components/shared/MetricCard.vue';
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'

definePageMeta({ layout: 'dashboard' })

const { setRefreshHandler, clearRefreshHandler, setLastUpdateText, registerProgressiveLoading } = useLayoutActions()

const lastUpdate = ref<Date>(new Date());

// ── Filters ──────────────────────────────────────────────────────────────
const dateRangeDates = ref<Date[] | null>(null);

// ── Search ────────────────────────────────────────────────────────────────
const searchQuery = ref('')
const debouncedSearch = ref('')
const isSearchPending = ref(false)

const commitSearch = useDebounceFn(() => {
  debouncedSearch.value = searchQuery.value.trim()
  currentPage.value = 1
  isSearchPending.value = false
}, 300)

watch(searchQuery, () => {
  isSearchPending.value = !!searchQuery.value.trim()
  commitSearch()
})

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
const itemsPerPage = ref(50)

const offset = computed(() => (currentPage.value - 1) * itemsPerPage.value)

// ── Data fetch ────────────────────────────────────────────────────────────
const { currentTenant } = useTenantReactive()
const { data: customersResponse, status: queryStatus, asyncStatus: queryAsyncStatus, error: fetchError, refetch } = useQuery({
  key: () => ['analytics', 'clientes', currentTenant.value?.id, {
    from: dateRange.value.from,
    to: dateRange.value.to,
    search: debouncedSearch.value || null,
    page: currentPage.value,
  }],
  query: () => $fetch('/api/orders/customers', {
    params: {
      date_from: dateRange.value.from || undefined,
      date_to: dateRange.value.to || undefined,
      search: debouncedSearch.value || undefined,
      limit: itemsPerPage.value,
      offset: offset.value,
    }
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const isLoading = computed(() => !customersResponse.value && !fetchError.value)
const isRefreshing = computed(() => queryAsyncStatus.value === 'loading' && customersResponse.value != null)

const customers = computed(() => customersResponse.value?.data || [])
const totalCustomers = computed(() => customersResponse.value?.total || 0)
const totalRevenue = computed(() => customersResponse.value?.total_revenue || 0)

const totalPages = computed(() => Math.ceil(totalCustomers.value / itemsPerPage.value))
const canGoPrevious = computed(() => currentPage.value > 1)
const canGoNext = computed(() => currentPage.value < totalPages.value)
const startItem = computed(() => totalCustomers.value === 0 ? 0 : (currentPage.value - 1) * itemsPerPage.value + 1)
const endItem = computed(() => Math.min(currentPage.value * itemsPerPage.value, totalCustomers.value))

// ── Waros balances (batch, non-blocking) ──────────────────────────────────
const warosBalances = ref<Record<string, number>>({})
const isLoadingBalances = ref(false)

const fetchWarosBalances = async (ids: string[]) => {
  if (!ids.length) return
  isLoadingBalances.value = true
  try {
    const res = await $fetch<{ balances: Record<string, number> }>(
      '/api/admin/waros/customers/balances',
      { params: { profile_ids: ids.join(',') } }
    )
    warosBalances.value = res.balances
  } catch {
    // Non-critical — Waros column shows 0 on error
  } finally {
    isLoadingBalances.value = false
  }
}

// ── Credit balances (batch, non-blocking) ─────────────────────────────────
const creditBalances = ref<Record<string, { amount: number; status: string }>>({})
const isLoadingCreditBalances = ref(false)

const fetchCreditBalances = async () => {
  isLoadingCreditBalances.value = true
  try {
    const res = await $fetch<{ success: boolean; data: Array<{ customer_id: string; total_outstanding: number; status: string }> }>(
      '/api/cartera/customers',
      { params: { status: 'all', limit: 200, offset: 0 } }
    )
    const map: Record<string, { amount: number; status: string }> = {}
    if (res.data) {
      for (const row of res.data) {
        if (row.customer_id) map[row.customer_id] = { amount: row.total_outstanding, status: row.status }
      }
    }
    creditBalances.value = map
  } catch {
    // Non-critical — Deuda column shows — on error
  } finally {
    isLoadingCreditBalances.value = false
  }
}

watch(customers, (list) => {
  const ids = (list as any[]).map((c) => c.customer_id).filter(Boolean)
  if (ids.length) fetchWarosBalances(ids)
  fetchCreditBalances()
})

// ── Table columns ─────────────────────────────────────────────────────────
const tableColumns = [
  { key: 'name', title: 'Cliente', sortable: false },
  { key: 'phone', title: 'Teléfono', sortable: false },
  { key: 'order_count', title: 'Pedidos', sortable: false },
  { key: 'total_spent', title: 'Total comprado', sortable: false },
  { key: 'avg_ticket', title: 'Ticket prom.', sortable: false },
  { key: 'last_order_date', title: 'Última compra', sortable: false },
  { key: 'waros_balance', title: 'Waros', sortable: false },
  { key: 'credit_balance', title: 'Deuda', sortable: false },
  { key: 'actions', title: '', sortable: false },
]

// ── Helpers ───────────────────────────────────────────────────────────────
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value || 0)

const formatDate = (isoDate: string) => {
  if (!isoDate) return '-'
  return fnsFormat(new Date(isoDate), 'dd/MM/yyyy', { locale: es })
}

// ── Actions ───────────────────────────────────────────────────────────────
const previousPage = () => { if (canGoPrevious.value) currentPage.value-- }
const nextPage = () => { if (canGoNext.value) currentPage.value++ }

const clearFilters = () => {
  dateRangeDates.value = null
  searchQuery.value = ''
  debouncedSearch.value = ''
  isSearchPending.value = false
  currentPage.value = 1
}

const hasFilters = computed(() => !!dateRangeDates.value || !!searchQuery.value)

const lastUpdateText = computed(() => formatDistanceToNow(lastUpdate.value, { addSuffix: true, locale: es }))

const handleRefresh = async () => {
  await refetch()
  lastUpdate.value = new Date()
}

watch(lastUpdate, () => { if (setLastUpdateText) setLastUpdateText(lastUpdateText.value) })
watch(dateRangeDates, () => { currentPage.value = 1 })
watch(() => currentTenant.value?.id, () => { currentPage.value = 1 })

onMounted(() => {
  if (setRefreshHandler) setRefreshHandler(handleRefresh)
  if (setLastUpdateText) setLastUpdateText(lastUpdateText.value)
})
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  if (clearRefreshHandler) clearRefreshHandler(handleRefresh)
  if (setLastUpdateText) setLastUpdateText(undefined)
})
</script>

<template>
  <div class="flex flex-col gap-3 md:gap-4">

    <!-- Filters Bar — always visible -->
    <ClientOnly>
      <div class="flex items-center gap-2 w-full overflow-x-auto scrollbar-hide">
        <div class="flex-1 min-w-0">
          <VueDatePicker
            v-model="dateRangeDates"
            range
            :preset-dates="presetDates"
            :enable-time-picker="false"
            :locale="es"
            placeholder="Rango de fechas"
            auto-apply
            :teleport="true"
            :max-date="new Date()"
            :format="formatDateRange"
            input-class-name="dp-custom-input"
            menu-class-name="dp-custom-menu"
            calendar-cell-class-name="dp-custom-cell"
          />
        </div>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar cliente..."
          aria-label="Buscar cliente por nombre o teléfono"
          class="flex-1 min-w-0 h-10 px-3 text-sm border-2 border-border rounded-lg bg-background text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
        />
        <button
          v-if="hasFilters"
          @click="clearFilters"
          class="h-10 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors flex-shrink-0"
          title="Limpiar filtros"
          aria-label="Limpiar filtros"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </ClientOnly>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error -->
    <CommonsTheErrorState v-else-if="fetchError" />

    <!-- Main Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4 pb-20">
      <!-- Summary Cards -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <MetricCard title="Clientes únicos" :value="totalCustomers" format="number" variant="primary" />
        <MetricCard title="Total comprado" :value="totalRevenue" format="currency" variant="primary" />
        <MetricCard title="Ticket promedio" :value="totalCustomers > 0 ? totalRevenue / totalCustomers : 0" format="currency" variant="primary" class="col-span-2 md:col-span-1" />
      </div>

      <HealthSemaphore :is-unlocked="true" title="Comportamiento y valor de clientes">
        <UiResponsiveDataView
          row-size="sm"
          :columns="tableColumns"
          :data="customers"
          empty-message="No hay clientes para mostrar"
          empty-sub-message="Registra ventas en el POS para ver tus clientes aquí"
          variant="default"
        >
          <template #card="{ item, index }">
            <NuxtLink
              :to="`/analitica/clientes/${item.customer_id}`"
              class="flex items-center gap-3 py-3 px-3 border-b border-border transition-colors hover:bg-surface-secondary"
              :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
            >
              <div class="flex-1 min-w-0">
                <span class="text-sm font-bold text-text-primary">{{ item.name }}</span>
                <p class="text-xs text-text-secondary mt-0.5">{{ item.phone || 'Sin teléfono' }} · {{ item.order_count }} pedidos · {{ formatDate(item.last_order_date) }}</p>
              </div>
              <div class="flex flex-col items-end gap-1 flex-shrink-0">
                <span class="text-sm font-bold text-text-primary">{{ formatCurrency(item.total_spent) }}</span>
                <span v-if="!isLoadingBalances && (warosBalances[item.customer_id] ?? 0) > 0" class="text-xs font-medium text-amber-700">
                  {{ (warosBalances[item.customer_id] ?? 0).toLocaleString('es-CO') }} Waros
                </span>
                <span
                  v-if="!isLoadingCreditBalances && (creditBalances[item.customer_id]?.amount ?? 0) > 0"
                  :class="[
                    'text-xs font-semibold',
                    creditBalances[item.customer_id].status === 'overdue' ? 'text-red-700' : 'text-amber-700'
                  ]"
                >
                  {{ formatCurrency(creditBalances[item.customer_id].amount) }} deuda
                </span>
              </div>
            </NuxtLink>
          </template>

          <template #cell-name="{ row }">
            <span class="text-sm font-bold text-text-primary">{{ row.name }}</span>
          </template>

          <template #cell-phone="{ value }">
            <span class="text-sm text-text-secondary">{{ value || '-' }}</span>
          </template>

          <template #cell-order_count="{ value }">
            <span class="text-sm font-medium text-text-primary">{{ value }}</span>
          </template>

          <template #cell-total_spent="{ value }">
            <span class="text-sm font-bold text-primary">{{ formatCurrency(value) }}</span>
          </template>

          <template #cell-avg_ticket="{ value }">
            <span class="text-sm text-text-secondary">{{ formatCurrency(value) }}</span>
          </template>

          <template #cell-last_order_date="{ value }">
            <span class="text-sm text-text-secondary">{{ formatDate(value) }}</span>
          </template>

          <template #cell-waros_balance="{ row }">
            <span v-if="isLoadingBalances" class="text-sm text-text-secondary">—</span>
            <span v-else class="text-sm font-medium text-amber-700">
              {{ (warosBalances[row.customer_id] ?? 0).toLocaleString('es-CO') }}
            </span>
          </template>

          <template #cell-credit_balance="{ row }">
            <span v-if="isLoadingCreditBalances" class="text-sm text-text-secondary">—</span>
            <template v-else-if="creditBalances[row.customer_id]?.amount > 0">
              <UiStatusBadge
                :value="formatCurrency(creditBalances[row.customer_id].amount)"
                format="text"
                :variant="creditBalances[row.customer_id].status === 'overdue' ? 'destructive' : 'warning'"
                size="sm"
              />
            </template>
            <span v-else class="text-sm text-text-secondary">—</span>
          </template>

          <template #cell-actions="{ row }">
            <div class="flex justify-center">
              <NuxtLink
                :to="`/analitica/clientes/${row.customer_id}`"
                class="text-text-secondary hover:text-primary transition-colors"
                title="Ver detalle"
                aria-label="Ver detalle del cliente"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </NuxtLink>
            </div>
          </template>
        </UiResponsiveDataView>

        <div v-if="totalCustomers > itemsPerPage" class="mt-4 bg-white px-4 py-3 flex items-center justify-between border border-titan-200 rounded-lg">
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
              de <span class="font-medium">{{ totalCustomers }}</span> clientes
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
      </HealthSemaphore>

    </div>
  </div>
</template>

<style>
.dp-custom-input {
  height: 40px !important;
  width: 100% !important;
  border: 2px solid hsl(var(--border)) !important;
  border-radius: 0.5rem !important;
  background: hsl(var(--background)) !important;
  font-size: 0.875rem !important;
  color: hsl(var(--foreground)) !important;
  padding-left: 0.75rem !important;
  padding-right: 0.75rem !important;
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
