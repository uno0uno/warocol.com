<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useTenantReactive } from '@/composables/useTenantReactive'
import type { Column } from '~/components/ui/ResponsiveDataView.vue'
// @ts-ignore
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'

definePageMeta({ layout: 'dashboard' })

useHead({ title: 'Domicilios — WARO' })

const { formatDateTime, formatCurrency } = useFormatters()
const { currentTenant } = useTenantReactive()

const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const { dateRangeDates, presetDates, formatDateRange, dateRange, clearDateRange } = useDateRangePresets()
const statusFilter = ref<string | null>(null)
const orderTypeFilter = ref<string | null>(null)

const sortField = ref('order_date')
const sortDirection = ref<'asc' | 'desc'>('desc')

const hasActiveFilters = computed(
  () =>
    !!localSearchTerm.value
    || !!appliedSearch.value
    || !!dateRangeDates.value
    || !!statusFilter.value
    || !!orderTypeFilter.value,
)

const performSearch = () => applySearch()

const clearFilters = () => {
  clearSearch()
  clearDateRange()
  statusFilter.value = null
  orderTypeFilter.value = null
}

const {
  data: ordersData,
  status: ordersStatus,
  asyncStatus: ordersAsyncStatus,
  error: fetchError,
  refetch: refetchOrders,
} = useQuery({
  key: () => ['online-orders', currentTenant.value?.id, {
    sortField: sortField.value,
    sortDirection: sortDirection.value,
    status: statusFilter.value,
  }],
  query: () => $fetch('/api/online/orders', {
    params: {
      limit: 200,
      offset: 0,
      sort_field: sortField.value,
      sort_direction: sortDirection.value,
      status: statusFilter.value || undefined,
    },
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const isLoadingOrders = computed(() => ordersStatus.value === 'loading' || (!ordersData.value && !fetchError.value))
const isRefreshingOrders = computed(() => ordersAsyncStatus.value === 'loading' && ordersData.value != null)
const ordersRaw = computed(() => ordersData.value?.data ?? [])

const displayOrders = computed(() => {
  const q = appliedSearch.value.trim().toLowerCase()
  const from = dateRange.value.from
  const to = dateRange.value.to

  return ordersRaw.value.filter((order: any) => {
    if (orderTypeFilter.value && order.order_type !== orderTypeFilter.value) return false
    if (from && to) {
      const day = String(order.order_date ?? '').slice(0, 10)
      if (!day || day < from || day > to) return false
    }
    if (!q) return true
    const num = String(order.order_number ?? '')
    const email = String(order.verified_email ?? '').toLowerCase()
    return num.includes(q) || email.includes(q)
  })
})

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => { setRefreshHandler(refetchOrders) })
onUnmounted(() => { clearRefreshHandler(refetchOrders) })
registerProgressiveLoading(isRefreshingOrders)

const columns: Column[] = [
  { key: 'order_number', title: '# Pedido', sortable: true },
  { key: 'order_date', title: 'Fecha', sortable: true },
  { key: 'scheduled_time', title: 'Programado', sortable: true },
  { key: 'order_type', title: 'Tipo', sortable: true },
  { key: 'status', title: 'Estado', sortable: false },
  { key: 'total_amount', title: 'Total', sortable: true },
  { key: 'verified_email', title: 'Cliente', sortable: true },
]

const ORDER_TYPE_LABELS: Record<string, string> = {
  delivery: 'Domicilio',
  pickup: 'Recogida',
  'dine-in': 'En mesa',
}

const { getStatusText, getStatusVariant } = useOnlineOrderStatus()

const handleSort = ({ field, direction }: { field: string; direction: 'asc' | 'desc' }) => {
  sortField.value = field
  sortDirection.value = direction
}

const viewOrder = (order: any) => {
  navigateTo(`/despacho/domicilios/${order.id}`)
}

</script>

<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <div v-if="isLoadingOrders" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError" />

    <div v-else class="flex flex-col gap-3 md:gap-4">
      <UiAdvancedFiltersBar
        v-model:search="localSearchTerm"
        v-model:date-range="dateRangeDates"
        search-placeholder="Buscar # pedido o cliente..."
        :search-fields="[]"
        :preset-dates="presetDates"
        :format-date-range="formatDateRange"
        :show-clear="hasActiveFilters"
        @search="performSearch"
        @clear="clearFilters"
      >
        <template #additional-filters>
          <select
            v-model="statusFilter"
            :class="filterSelectClass"
            aria-label="Filtrar por estado"
          >
            <option :value="null">Estado</option>
            <option value="pending">Pendiente</option>
            <option value="confirmed">Confirmado</option>
            <option value="preparing">En preparación</option>
            <option value="delivered">Entregado</option>
            <option value="completed">Completado</option>
            <option value="cancelled">Cancelado</option>
          </select>
          <select
            v-model="orderTypeFilter"
            :class="filterSelectClass"
            aria-label="Filtrar por tipo de pedido"
          >
            <option :value="null">Tipo</option>
            <option value="delivery">Domicilio</option>
            <option value="pickup">Recogida</option>
            <option value="dine-in">En mesa</option>
          </select>
        </template>
      </UiAdvancedFiltersBar>

      <HealthSemaphore :is-unlocked="true" title="Pedidos Online">
        <UiResponsiveDataView
          row-size="sm"
          :columns="columns"
          :data="displayOrders"
          :sort-field="sortField"
          :sort-direction="sortDirection"
          empty-message="Aún no hay pedidos online."
          empty-sub-message="Los domicilios y recogidas aparecerán aquí."
          variant="default"
          @sort="handleSort"
          @row-click="viewOrder"
        >
          <template #card="{ item, index }">
            <div
              class="flex items-center gap-3 py-3 px-3 border-b border-border cursor-pointer transition-colors hover:bg-surface-secondary"
              :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
              @click="viewOrder(item)"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-text-primary leading-tight truncate">
                  <span class="text-primary">#{{ item.order_number }}</span>
                  <span class="text-text-secondary font-normal"> · {{ item.verified_email ?? '—' }}</span>
                </p>
                <p class="text-xs text-text-secondary mt-0.5">
                  {{ ORDER_TYPE_LABELS[item.order_type] ?? item.order_type }} · {{ formatDateTime(item.order_date) }}
                </p>
              </div>
              <div class="flex flex-col items-end gap-1 flex-shrink-0">
                <UiStatusBadge :variant="getStatusVariant(item.status)" size="sm" format="text">
                  {{ getStatusText(item.status, item.order_type) }}
                </UiStatusBadge>
                <span class="text-sm font-bold text-primary">{{ formatCurrency(item.total_amount) }}</span>
              </div>
            </div>
          </template>

          <template #cell-order_number="{ value }">
            <span class="text-sm font-bold text-text-primary">#{{ value }}</span>
          </template>
          <template #cell-order_date="{ value }">
            <span class="text-sm text-text-secondary">{{ formatDateTime(value) }}</span>
          </template>
          <template #cell-scheduled_time="{ value }">
            <span class="text-sm text-text-secondary">
              {{ value ? formatDateTime(value) : 'Inmediato' }}
            </span>
          </template>
          <template #cell-order_type="{ value }">
            <UiStatusBadge :value="ORDER_TYPE_LABELS[value] ?? value" format="text" variant="info" size="sm" />
          </template>
          <template #cell-status="{ value, row }">
            <UiStatusBadge :variant="getStatusVariant(value)" size="sm" format="text">
              {{ getStatusText(value, row.order_type) }}
            </UiStatusBadge>
          </template>
          <template #cell-total_amount="{ value }">
            <span class="text-sm font-bold text-primary">{{ formatCurrency(value) }}</span>
          </template>
          <template #cell-verified_email="{ value }">
            <span class="text-sm text-text-secondary">{{ value ?? '—' }}</span>
          </template>
        </UiResponsiveDataView>
      </HealthSemaphore>
    </div>
  </div>
</template>
