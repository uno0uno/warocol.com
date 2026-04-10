<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import MetricCard from '~/components/shared/MetricCard.vue'

const { setRefreshHandler, clearRefreshHandler, setLastUpdateText, registerProgressiveLoading } = useLayoutActions()
const { currentTenant } = useTenantReactive()

const lastUpdate = ref<Date>(new Date())

// ── Status filter ─────────────────────────────────────────────────────────
const statusFilter = ref<'all' | 'overdue' | 'current'>('all')

// ── Aging bucket filter (client-side) ─────────────────────────────────────
const agingFilter = ref<string | null>(null)

const agingRanges: Record<string, (days: number) => boolean> = {
  '0–30 días':  d => d <= 30,
  '31–60 días': d => d > 30 && d <= 60,
  '61–90 días': d => d > 60 && d <= 90,
  '90+ días':   d => d > 90,
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
  key: () => ['cartera', 'customers', currentTenant.value?.id, statusFilter.value],
  query: () => $fetch<{ success: boolean; data: Array<{ customer_id: string; name: string; phone: string | null; total_outstanding: number; oldest_order_days: number; order_count: number; status: 'overdue' | 'current' }> }>('/api/cartera/customers', {
    params: { status: statusFilter.value, limit: 200, offset: 0 },
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 60_000,
})

const customers = computed(() => customersData.value?.data ?? [])

const filteredCustomers = computed(() => {
  if (!agingFilter.value) return customers.value
  const rangeFn = agingRanges[agingFilter.value]
  if (!rangeFn) return customers.value
  return customers.value.filter(c => rangeFn(c.oldest_order_days))
})

const isLoadingCustomers = computed(() => !customersData.value && !customersError.value)
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
  'bg-emerald-500',
  'bg-amber-500',
  'bg-orange-500',
  'bg-red-500',
]

const agingColors = [
  {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-400',
    amount: 'text-emerald-800 dark:text-emerald-300',
    active: 'ring-2 ring-emerald-400 dark:ring-emerald-500',
  },
  {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-400',
    amount: 'text-amber-800 dark:text-amber-300',
    active: 'ring-2 ring-amber-400 dark:ring-amber-500',
  },
  {
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-200 dark:border-orange-800',
    text: 'text-orange-700 dark:text-orange-400',
    amount: 'text-orange-800 dark:text-orange-300',
    active: 'ring-2 ring-orange-400 dark:ring-orange-500',
  },
  {
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-700 dark:text-red-400',
    amount: 'text-red-800 dark:text-red-300',
    active: 'ring-2 ring-red-400 dark:ring-red-500',
  },
]

// ── Table columns ─────────────────────────────────────────────────────────
const tableColumns = [
  { key: 'name',              title: 'Cliente',     sortable: false },
  { key: 'total_outstanding', title: 'Deuda total', sortable: false },
  { key: 'order_count',       title: 'Órdenes',     sortable: false },
  { key: 'oldest_order_days', title: 'Días mora',   sortable: false },
  { key: 'status',            title: 'Estado',      sortable: false },
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
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <MetricCard
          title="Total por cobrar"
          :value="summary.total_outstanding"
          format="currency"
          variant="primary"
        />
        <MetricCard
          title="Clientes con deuda"
          :value="summary.customer_count"
          format="number"
          variant="primary"
        />
        <MetricCard
          title="Monto vencido"
          :value="summary.overdue_amount"
          format="currency"
          variant="primary"
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

      <!-- Filters Bar -->
      <div class="flex items-center gap-2 w-full overflow-x-auto scrollbar-hide">
        <select
          v-model="statusFilter"
          class="py-2 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0"
          aria-label="Filtrar por estado"
        >
          <option value="all">Todas</option>
          <option value="overdue">Vencidas</option>
          <option value="current">Al día</option>
        </select>
        <button
          v-if="statusFilter !== 'all'"
          @click="statusFilter = 'all'"
          class="h-10 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors"
          aria-label="Limpiar filtros"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Debtors Table -->
      <UiResponsiveDataView
        :columns="tableColumns"
        :data="filteredCustomers"
        empty-message="Sin deudas pendientes"
        empty-sub-message="No hay clientes con saldo pendiente en este momento"
        variant="default"
      >
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
                · {{ item.oldest_order_days }}d mora
              </p>
            </div>
            <div class="flex flex-col items-end gap-1 flex-shrink-0">
              <span class="text-sm font-bold" :class="item.status === 'overdue' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'">
                {{ formatCurrency(item.total_outstanding) }}
              </span>
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                :class="item.status === 'overdue' ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'"
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
            class="text-sm font-semibold text-text-primary hover:text-primary transition-colors cursor-pointer"
          >
            {{ row.name }}
          </NuxtLink>
        </template>

        <template #cell-total_outstanding="{ value }">
          <span class="text-sm font-bold text-text-primary">{{ formatCurrency(value) }}</span>
        </template>

        <template #cell-order_count="{ value }">
          <span class="text-sm text-text-secondary">{{ value }}</span>
        </template>

        <template #cell-oldest_order_days="{ value }">
          <span class="text-sm" :class="value > 30 ? 'text-red-700 dark:text-red-400 font-medium' : 'text-text-secondary'">
            {{ value }}d
          </span>
        </template>

        <template #cell-status="{ row }">
          <div class="flex items-center gap-2">
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
              :class="row.status === 'overdue' ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'"
            >
              {{ row.status === 'overdue' ? 'VENCIDA' : 'Al día' }}
            </span>
            <NuxtLink
              :to="`/analitica/clientes/${row.customer_id}`"
              class="text-text-secondary hover:text-primary transition-colors"
              title="Ver detalle del cliente"
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

    </div>
  </div>
</template>
