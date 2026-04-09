<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import MetricCard from '~/components/shared/MetricCard.vue'

const { setRefreshHandler, clearRefreshHandler, setLastUpdateText, registerProgressiveLoading } = useLayoutActions()
const { currentTenant } = useTenantReactive()

const lastUpdate = ref<Date>(new Date())

// ── Status filter ─────────────────────────────────────────────────────────
const statusFilter = ref<'all' | 'overdue' | 'current'>('all')

// ── Summary ───────────────────────────────────────────────────────────────
const { data: summaryData, status: summaryStatus, error: summaryError, refetch: refetchSummary } = useQuery({
  key: () => ['cartera', 'summary', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: { total_outstanding: number; customer_count: number; overdue_count: number; overdue_amount: number } }>('/api/cartera/summary'),
  enabled: () => !!currentTenant.value,
  staleTime: 60_000,
})

const summary = computed(() => summaryData.value?.data ?? { total_outstanding: 0, customer_count: 0, overdue_count: 0, overdue_amount: 0 })

// ── Customers list ────────────────────────────────────────────────────────
const { data: customersData, status: customersStatus, asyncStatus: customersAsyncStatus, error: customersError, refetch: refetchCustomers } = useQuery({
  key: () => ['cartera', 'customers', currentTenant.value?.id, statusFilter.value],
  query: () => $fetch<{ success: boolean; data: Array<{ customer_id: string; name: string; phone: string | null; total_outstanding: number; oldest_order_days: number; order_count: number; status: 'overdue' | 'current' }> }>('/api/cartera/customers', {
    params: { status: statusFilter.value, limit: 200, offset: 0 },
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 60_000,
})

const customers = computed(() => customersData.value?.data ?? [])
const isLoadingCustomers = computed(() => !customersData.value && !customersError.value)
const isRefreshingCustomers = computed(() => customersAsyncStatus.value === 'loading' && customersData.value != null)

// ── Aging ─────────────────────────────────────────────────────────────────
const { data: agingData, status: agingStatus, error: agingError, refetch: refetchAging } = useQuery({
  key: () => ['cartera', 'aging', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: Array<{ label: string; customer_count: number; total_amount: number }> }>('/api/cartera/aging'),
  enabled: () => !!currentTenant.value,
  staleTime: 60_000,
})

const agingBuckets = computed(() => agingData.value?.data ?? [])

const agingColors = [
  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', amount: 'text-emerald-800' },
  { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   amount: 'text-amber-800' },
  { bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-700',  amount: 'text-orange-800' },
  { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     amount: 'text-red-800' },
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
        :data="customers"
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
              <span class="text-sm font-bold" :class="item.status === 'overdue' ? 'text-red-700' : 'text-amber-700'">
                {{ formatCurrency(item.total_outstanding) }}
              </span>
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                :class="item.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'"
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
          <span class="text-sm" :class="value > 30 ? 'text-red-700 font-medium' : 'text-text-secondary'">
            {{ value }}d
          </span>
        </template>

        <template #cell-status="{ row }">
          <div class="flex items-center gap-2">
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
              :class="row.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'"
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

      <!-- Aging Section -->
      <div v-if="agingBuckets.length > 0" class="mt-2">
        <h3 class="text-sm font-semibold text-text-primary mb-3">Antigüedad de cartera</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div
            v-for="(bucket, idx) in agingBuckets"
            :key="bucket.label"
            class="rounded-xl border-2 px-4 py-3 flex flex-col gap-1"
            :class="[agingColors[idx]?.bg ?? 'bg-surface', agingColors[idx]?.border ?? 'border-border']"
          >
            <span class="text-xs font-semibold" :class="agingColors[idx]?.text ?? 'text-text-secondary'">
              {{ bucket.label }}
            </span>
            <span class="text-lg font-bold" :class="agingColors[idx]?.amount ?? 'text-text-primary'">
              {{ formatCurrency(bucket.total_amount) }}
            </span>
            <span class="text-xs" :class="agingColors[idx]?.text ?? 'text-text-secondary'">
              {{ bucket.customer_count }} cliente{{ bucket.customer_count !== 1 ? 's' : '' }}
            </span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
