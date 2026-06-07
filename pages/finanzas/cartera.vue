<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { filterSelectClass } from '~/composables/useFilterSelectClass'
import MetricCard from '~/components/shared/MetricCard.vue'

const { setRefreshHandler, clearRefreshHandler, setLastUpdateText, registerProgressiveLoading } = useLayoutActions()
const { currentTenant } = useTenantReactive()

const lastUpdate = ref<Date>(new Date())

// ── Status filter ─────────────────────────────────────────────────────────
const statusFilter = ref<'all' | 'overdue' | 'current'>('all')

// ── Aging bucket filter (server-side) ─────────────────────────────────────
const agingFilter = ref<string | null>(null)

const agingRanges: Record<string, { days_min?: number; days_max?: number }> = {
  '0–30 días':  { days_min: 0,  days_max: 30 },
  '31–60 días': { days_min: 31, days_max: 60 },
  '61–90 días': { days_min: 61, days_max: 90 },
  '90+ días':   { days_min: 91 },
}

const selectAgingBucket = (label: string) => {
  if (agingFilter.value === label) {
    agingFilter.value = null
  } else {
    agingFilter.value = label
    statusFilter.value = 'all'
  }
}

watch(statusFilter, () => { agingFilter.value = null })

const hasActiveFilters = computed(
  () => statusFilter.value !== 'all' || !!agingFilter.value,
)

const clearFilters = () => {
  statusFilter.value = 'all'
  agingFilter.value = null
}

const statusFilterOptions = [
  { label: 'Vencidas', value: 'overdue' },
  { label: 'Al día', value: 'current' },
]

const setStatusFilter = (value: string | boolean) => {
  statusFilter.value = typeof value === 'string' && value ? value as 'overdue' | 'current' : 'all'
}

// ── Summary ───────────────────────────────────────────────────────────────
const { data: summaryData, error: summaryError, refetch: refetchSummary } = useQuery({
  key: () => ['cartera', 'summary', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: { total_outstanding: number; customer_count: number; overdue_count: number; overdue_amount: number } }>('/api/cartera/summary'),
  enabled: () => !!currentTenant.value,
  staleTime: 60_000,
})

const summary = computed(() => summaryData.value?.data ?? { total_outstanding: 0, customer_count: 0, overdue_count: 0, overdue_amount: 0 })

// ── Customers list ────────────────────────────────────────────────────────
const { data: customersData, asyncStatus: customersAsyncStatus, error: customersError, refetch: refetchCustomers } = useQuery({
  key: () => ['cartera', 'customers', currentTenant.value?.id, statusFilter.value, agingFilter.value],
  query: () => {
    const range = agingFilter.value ? agingRanges[agingFilter.value] : {}
    return $fetch<{ success: boolean; data: Array<{ customer_id: string; name: string; phone: string | null; total_outstanding: number; oldest_order_days: number; order_count: number; status: 'overdue' | 'current' }> }>('/api/cartera/customers', {
      params: { status: statusFilter.value, limit: 200, offset: 0, ...range },
    })
  },
  enabled: () => !!currentTenant.value,
  staleTime: 60_000,
})

const customers = computed(() => customersData.value?.data ?? [])

const isLoadingCustomers    = computed(() => customersData.value == null && !customersError.value)
const isRefreshingCustomers = computed(() => customersAsyncStatus.value === 'loading' && customersData.value != null)

// ── Aging ─────────────────────────────────────────────────────────────────
const { data: agingData, refetch: refetchAging } = useQuery({
  key: () => ['cartera', 'aging', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: Array<{ label: string; customer_count: number; total_amount: number }> }>('/api/cartera/aging'),
  enabled: () => !!currentTenant.value,
  staleTime: 60_000,
})

const agingBuckets = computed(() => agingData.value?.data ?? [])

const agingDots = [
  'bg-state-success-icon',
  'bg-state-warning-icon',
  'bg-state-warning-icon',
  'bg-state-danger-icon',
]

const agingColors = [
  {
    bg: 'bg-state-success-bg',
    border: 'border-state-success-border',
    text: 'text-state-success-text',
    amount: 'text-state-success-text',
    active: 'ring-2 ring-state-success-icon',
  },
  {
    bg: 'bg-state-warning-bg',
    border: 'border-state-warning-border',
    text: 'text-state-warning-text',
    amount: 'text-state-warning-text',
    active: 'ring-2 ring-state-warning-icon',
  },
  {
    bg: 'bg-state-warning-bg',
    border: 'border-state-warning-border',
    text: 'text-state-warning-text',
    amount: 'text-state-warning-text',
    active: 'ring-2 ring-state-warning-icon',
  },
  {
    bg: 'bg-state-danger-bg',
    border: 'border-state-danger-border',
    text: 'text-state-danger-text',
    amount: 'text-state-danger-text',
    active: 'ring-2 ring-state-danger-icon',
  },
]

// ── Table columns ─────────────────────────────────────────────────────────
const tableColumns = [
  { key: 'name',              title: 'Cliente',     sortable: false },
  { key: 'total_outstanding', title: 'Deuda total', sortable: false },
  { key: 'order_count',       title: 'Órdenes',     sortable: false },
  { key: 'oldest_order_days', title: 'Días mora',   sortable: false },
  { key: 'status',            title: 'Estado',      sortable: false },
  { key: 'actions',           title: 'Acciones',    sortable: false },
]

// ── Helpers ───────────────────────────────────────────────────────────────
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value || 0)

const isRefreshing = computed(() => isRefreshingCustomers.value)

const handleRefresh = async () => {
  await Promise.all([refetchSummary(), refetchCustomers(), refetchAging()])
  lastUpdate.value = new Date()
}

import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
const lastUpdateText = computed(() => formatDistanceToNow(lastUpdate.value, { addSuffix: true, locale: es }))

watch(lastUpdate, () => { if (setLastUpdateText) setLastUpdateText(lastUpdateText.value) })

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

    <!-- Loading -->
    <div v-if="isLoadingCustomers" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error -->
    <CommonsTheErrorState v-else-if="customersError || summaryError" />

    <!-- Main Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4 pb-20">

      <!-- Summary Cards -->
      <div class="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-3">
        <MetricCard title="Total por cobrar" :value="summary.total_outstanding" format="currency" variant="primary" />
        <MetricCard title="Clientes con deuda" :value="summary.customer_count" format="number" variant="primary" />
        <MetricCard
          title="Monto vencido"
          :value="summary.overdue_amount"
          format="currency"
          :variant="summary.overdue_amount > 0 ? 'destructive' : 'primary'"
          class="col-span-2 md:col-span-1"
        />
      </div>

      <!-- Aging Section — antigüedad de cartera (encima de la tabla) -->
      <div v-if="agingBuckets.length > 0" class="bg-white border border-border rounded-xl overflow-hidden">
        <!-- Header -->
        <div class="px-5 py-4 flex items-center justify-between border-b border-border">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="text-sm font-semibold text-text-primary">Antigüedad de cartera</h3>
          </div>
          <button
            v-if="agingFilter"
            @click="agingFilter = null"
            class="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Limpiar filtro de antigüedad"
          >
            <span class="font-medium">{{ agingFilter }}</span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Buckets grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
          <button
            v-for="(bucket, idx) in agingBuckets"
            :key="bucket.label"
            type="button"
            class="p-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-inset"
            :class="[
              agingFilter === bucket.label
                ? (agingColors[idx]?.bg ?? 'bg-surface-secondary') + ' ' + (agingColors[idx]?.focusRing ?? 'focus:ring-primary')
                : 'hover:bg-surface-secondary/50',
              idx < 2 ? 'border-b sm:border-b-0' : '',
            ]"
            :aria-pressed="agingFilter === bucket.label"
            :aria-label="`Filtrar por ${bucket.label}: ${bucket.customer_count} clientes`"
            @click="selectAgingBucket(bucket.label)"
          >
            <div class="flex items-center gap-1.5 mb-1.5">
              <div class="w-2 h-2 rounded-full flex-shrink-0" :class="agingDots[idx]" />
              <p class="text-xs text-text-secondary uppercase tracking-wider font-medium">{{ bucket.label }}</p>
            </div>
            <p class="text-base font-bold leading-tight" :class="agingColors[idx]?.amount ?? 'text-text-primary'">
              {{ formatCurrency(bucket.total_amount) }}
            </p>
            <p class="text-xs text-text-secondary mt-0.5">
              {{ bucket.customer_count }} cliente{{ bucket.customer_count !== 1 ? 's' : '' }}
            </p>
          </button>
        </div>
      </div>

      <UiAdvancedFiltersBar
        :search-fields="[]"
        :show-search="false"
        :show-date-range="false"
        :show-clear="hasActiveFilters"
        @clear="clearFilters"
      >
        <template #additional-filters>
          <select
            v-model="statusFilter"
            :class="[filterSelectClass, 'md:hidden']"
            aria-label="Filtrar por estado"
          >
            <option value="all">Estado</option>
            <option v-for="option in statusFilterOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </template>
      </UiAdvancedFiltersBar>

      <!-- Debtors Table -->
      <UiResponsiveDataView
        row-size="sm"
        :columns="tableColumns"
        :data="customers"
        empty-message="Sin deudas pendientes"
        empty-sub-message="No hay clientes con saldo pendiente en este momento"
        variant="default"
      >
        <template #header-status>
          <UiTableHeaderFilter
            :model-value="statusFilter === 'all' ? '' : statusFilter"
            title="Estado"
            filter-type="select"
            :options="statusFilterOptions"
            all-label="Todos"
            @update:model-value="setStatusFilter"
          />
        </template>

        <!-- Mobile card -->
        <template #card="{ item, index }">
          <div
            class="flex items-center gap-3 py-3 px-3 border-b border-border transition-colors hover:bg-surface-secondary cursor-pointer"
            :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
            @click="navigateTo(`/analitica/clientes/${item.customer_id}`)"
            role="button"
            tabindex="0"
            :aria-label="`Ver detalle de ${item.name}`"
            @keydown.enter="navigateTo(`/analitica/clientes/${item.customer_id}`)"
          >
            <div class="flex-1 min-w-0">
              <span class="text-sm font-bold text-text-primary">{{ item.name }}</span>
              <p class="text-xs text-text-secondary mt-0.5">
                {{ item.phone || 'Sin teléfono' }}
                · {{ item.order_count }} orden{{ item.order_count !== 1 ? 'es' : '' }}
                · {{ item.oldest_order_days }} días mora
              </p>
            </div>
            <div class="flex flex-col items-end gap-1 flex-shrink-0">
              <span class="text-sm font-bold" :class="item.status === 'overdue' ? 'text-state-danger-text' : 'text-state-warning-text'">
                {{ formatCurrency(item.total_outstanding) }}
              </span>
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                :class="item.status === 'overdue' ? 'bg-state-danger-bg text-state-danger-text' : 'bg-state-warning-bg text-state-warning-text'"
              >
                {{ item.status === 'overdue' ? 'VENCIDA' : 'Al día' }}
              </span>
            </div>
          </div>
        </template>

        <!-- Desktop cells -->
        <template #cell-name="{ row }">
          <NuxtLink
            :to="`/analitica/clientes/${row.customer_id}`"
            class="text-sm font-bold text-text-primary hover:text-primary transition-colors cursor-pointer"
          >
            {{ row.name }}
          </NuxtLink>
        </template>

        <template #cell-total_outstanding="{ value }">
          <span class="text-sm font-bold text-primary">{{ formatCurrency(value) }}</span>
        </template>

        <template #cell-order_count="{ value }">
          <span class="text-sm text-text-secondary">{{ value }}</span>
        </template>

        <template #cell-oldest_order_days="{ value }">
          <span class="text-sm" :class="value > 30 ? 'text-destructive font-medium' : 'text-text-secondary'">
            {{ value }} días
          </span>
        </template>

        <template #cell-status="{ row }">
          <UiStatusBadge
            :value="row.status === 'overdue' ? 'VENCIDA' : 'Al día'"
            format="text"
            :variant="row.status === 'overdue' ? 'destructive' : 'warning'"
            size="sm"
          />
        </template>

        <template #cell-actions="{ row }">
          <NuxtLink
            :to="`/analitica/clientes/${row.customer_id}`"
            class="text-text-secondary hover:text-primary transition-colors"
            title="Ver detalle del cliente"
            :aria-label="`Ver detalle de ${row.name}`"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </NuxtLink>
        </template>
      </UiResponsiveDataView>

    </div>
  </div>
</template>
