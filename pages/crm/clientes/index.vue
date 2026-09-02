<script setup lang="ts">
const { t, locale } = useI18n({ useScope: 'global' })
useHead({ title: () => t('analitica.head.clientes') })
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useDebounceFn } from '@vueuse/core'
import { enUS, es } from 'date-fns/locale';
import { formatDistanceToNow } from 'date-fns';
import MetricCard from '~/components/shared/MetricCard.vue';

definePageMeta({ layout: 'dashboard', module: 'crm' })

const { setRefreshHandler, clearRefreshHandler, setLastUpdateText, registerProgressiveLoading } = useLayoutActions()

const lastUpdate = ref<Date>(new Date());

// ── Filters ──────────────────────────────────────────────────────────────
const { dateRangeDates, presetDates, maxDate, formatDateRange, dateRange } = useDateRangePresets()
const { timezone } = useTenantTimezone()
const { formatCalendarDate, formatDate: formatTenantDate, formatCurrency, formatNumber } = useFormatters()
const dateFnsLocale = computed(() => toDateFnsLocale(locale.value))

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
const tableColumns = computed(() => [
  { key: 'name', title: t('analitica.clientes.customer'), sortable: false },
  { key: 'document', title: t('analitica.clientes.document'), sortable: false },
  { key: 'phone', title: t('analitica.clientes.phone'), sortable: false },
  { key: 'order_count', title: t('analitica.clientes.orders'), sortable: false },
  { key: 'total_spent', title: t('analitica.clientes.totalBought'), sortable: false },
  { key: 'avg_ticket', title: t('analitica.clientes.avgTicketShort'), sortable: false },
  { key: 'last_order_date', title: t('analitica.clientes.lastPurchase'), sortable: false },
  { key: 'waros_balance', title: t('analitica.clientes.waros'), sortable: false },
  { key: 'credit_balance', title: t('analitica.clientes.debt'), sortable: false },
  { key: 'actions', title: '', sortable: false },
])

// ── Helpers ───────────────────────────────────────────────────────────────
const formatDate = (isoDate: string) => {
  if (!isoDate) return '-'
  return /^\d{4}-\d{2}-\d{2}$/.test(isoDate)
    ? formatCalendarDate(isoDate)
    : formatTenantDate(isoDate)
}

const formatWaros = (value: number) => formatNumber(value || 0, { maximumFractionDigits: 0 })

const formatOrderCount = (count: number) =>
  t(count === 1 ? 'analitica.clientes.orderCountOne' : 'analitica.clientes.orderCountMany', { count })

const formatFiscalLabel = (row: {
  fiscal_id_type?: string | null
  fiscal_id?: string | null
  fiscal_business_name?: string | null
  fiscal_email?: string | null
}) => {
  if (row.fiscal_id_type && row.fiscal_id) {
    return t('analitica.clientes.fiscalDocument', { type: row.fiscal_id_type, id: row.fiscal_id })
  }
  return row.fiscal_business_name || row.fiscal_email || null
}

const hasFiscalData = (row: {
  fiscal_id_type?: string | null
  fiscal_id?: string | null
  fiscal_business_name?: string | null
  fiscal_email?: string | null
}) => !!(
  (row.fiscal_id_type && row.fiscal_id)
  || row.fiscal_business_name
  || row.fiscal_email
)

const router = useRouter()
const showCreateModal = ref(false)

// ── Actions ───────────────────────────────────────────────────────────────
const onCustomerCreated = async (customer: { id: string }) => {
  await refetch()
  await router.push(`/crm/clientes/${customer.id}`)
}

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

const lastUpdateText = computed(() => formatDistanceToNow(lastUpdate.value, { addSuffix: true, locale: dateFnsLocale.value }))

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

    <AnaliticaCreateCustomerModal
      v-model="showCreateModal"
      @created="onCustomerCreated"
    />

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
        <MetricCard :title="t('analitica.clientes.unique')" :value="totalCustomers" format="number" variant="primary" />
        <MetricCard :title="t('analitica.clientes.totalBought')" :value="totalRevenue" format="currency" variant="primary" />
        <MetricCard :title="t('analitica.clientes.avgTicket')" :value="totalCustomers > 0 ? totalRevenue / totalCustomers : 0" format="currency" variant="primary" class="col-span-2 md:col-span-1" />
      </div>

      <!-- Filters Bar -->
      <ClientOnly>
        <div class="flex items-center gap-2 w-full overflow-x-auto scrollbar-hide">
          <div class="flex-1 min-w-0">
            <VueDatePicker
              v-model="dateRangeDates"
              range
              :preset-dates="presetDates"
              :enable-time-picker="false"
              :locale="dateFnsLocale"
              :placeholder="t('analitica.common.dateRange')"
              auto-apply
              :teleport="true"
              :timezone="timezone"
              :max-date="maxDate"
              :format="formatDateRange"
              input-class-name="dp-custom-input"
              menu-class-name="dp-custom-menu"
              calendar-cell-class-name="dp-custom-cell"
            />
          </div>
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('analitica.clientes.search')"
            :aria-label="t('analitica.clientes.searchLong')"
            class="flex-1 min-w-0 h-10 px-3 text-sm border-2 border-border rounded-lg bg-background text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
          />
          <button
            v-if="hasFilters"
            @click="clearFilters"
            class="h-10 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors flex-shrink-0"
            :title="t('analitica.common.clearFilters')"
            :aria-label="t('analitica.common.clearFilters')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <button
            type="button"
            @click="showCreateModal = true"
            class="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex-shrink-0 whitespace-nowrap"
            :aria-label="t('analitica.clientes.createNew')"
          >
            {{ t('analitica.clientes.new') }}
          </button>
        </div>
      </ClientOnly>

      <!-- Table loading (filter change, no cached data yet) -->
      <div v-if="isRefreshing && customers.length === 0" class="flex items-center justify-center min-h-[200px]">
        <CommonsTheCustomLoader size="medium" />
      </div>

      <template v-else>
        <UiResponsiveDataView
          row-size="sm"
          :columns="tableColumns"
          :data="customers"
          :empty-message="t('analitica.clientes.empty')"
          :empty-sub-message="t('analitica.clientes.emptySub')"
          variant="default"
        >
          <template #card="{ item, index }">
            <NuxtLink
              :to="`/crm/clientes/${item.customer_id}`"
              class="flex items-center gap-3 py-3 px-3 border-b border-border transition-colors hover:bg-surface-secondary"
              :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
            >
              <div class="flex-1 min-w-0">
                <span class="text-sm font-bold text-text-primary">{{ item.name }}</span>
                <p class="text-xs text-text-secondary mt-0.5">
                  {{ item.phone || t('analitica.clientes.noPhone') }} · {{ formatOrderCount(item.order_count) }}<template v-if="item.last_order_date"> · {{ formatDate(item.last_order_date) }}</template>
                </p>
                <p v-if="hasFiscalData(item) && formatFiscalLabel(item)" class="text-xs text-text-secondary mt-0.5 truncate">
                  {{ formatFiscalLabel(item) }}
                </p>
              </div>
              <div class="flex flex-col items-end gap-1 flex-shrink-0">
                <span class="text-sm font-bold text-text-primary">{{ formatCurrency(item.total_spent) }}</span>
                <span v-if="!isLoadingBalances" class="text-xs font-medium text-primary tabular-nums">
                  {{ formatWaros(warosBalances[item.customer_id] ?? 0) }} {{ t('analitica.clientes.waros') }}
                </span>
                <span
                  v-if="!isLoadingCreditBalances"
                  :class="[
                    'text-xs font-semibold tabular-nums',
                    (creditBalances[item.customer_id]?.amount ?? 0) > 0
                      ? (creditBalances[item.customer_id].status === 'overdue' ? 'text-destructive' : 'text-warning')
                      : 'text-text-secondary',
                  ]"
                >
                  <template v-if="(creditBalances[item.customer_id]?.amount ?? 0) > 0">
                    {{ t('analitica.clientes.debtAmount', { amount: formatCurrency(creditBalances[item.customer_id].amount) }) }}
                  </template>
                  <template v-else>{{ t('analitica.clientes.noDebt') }}</template>
                </span>
              </div>
            </NuxtLink>
          </template>

          <template #cell-name="{ row }">
            <span class="text-sm font-bold text-text-primary">{{ row.name }}</span>
          </template>

          <template #cell-document="{ row }">
            <span v-if="hasFiscalData(row) && formatFiscalLabel(row)" class="text-sm text-text-secondary">
              {{ formatFiscalLabel(row) }}
            </span>
            <span v-else class="text-sm text-text-secondary">—</span>
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
            <span v-else class="text-sm font-medium text-primary">
              {{ formatWaros(warosBalances[row.customer_id] ?? 0) }}
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
                :to="`/crm/clientes/${row.customer_id}`"
                class="text-text-secondary hover:text-primary transition-colors"
                :title="t('analitica.clientes.viewDetail')"
                :aria-label="t('analitica.clientes.viewCustomer')"
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
              {{ t('analitica.clientes.prev') }}
            </button>
            <button @click="nextPage" :disabled="!canGoNext"
              :class="['relative inline-flex items-center px-4 py-2 border border-titan-300 text-sm font-medium rounded-md', canGoNext ? 'text-titan-700 bg-white hover:bg-titan-50' : 'text-titan-400 bg-titan-50 cursor-not-allowed']">
              {{ t('analitica.clientes.next') }}
            </button>
          </div>
          <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <p class="text-sm text-titan-700">
              {{ t('analitica.clientes.showingRange', { start: startItem, end: endItem, total: totalCustomers }) }}
            </p>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button @click="previousPage" :disabled="!canGoPrevious"
                :class="['relative inline-flex items-center px-2 py-2 rounded-s-md border border-titan-300 text-sm font-medium', canGoPrevious ? 'text-titan-500 bg-white hover:bg-titan-50' : 'text-titan-300 bg-titan-50 cursor-not-allowed']">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span class="relative inline-flex items-center px-4 py-2 border border-titan-300 bg-white text-sm font-medium text-titan-700">
                {{ currentPage }} / {{ totalPages }}
              </span>
              <button @click="nextPage" :disabled="!canGoNext"
                :class="['relative inline-flex items-center px-2 py-2 rounded-e-md border border-titan-300 text-sm font-medium', canGoNext ? 'text-titan-500 bg-white hover:bg-titan-50' : 'text-titan-300 bg-titan-50 cursor-not-allowed']">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
              </button>
            </nav>
          </div>
        </div>
      </template>

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
