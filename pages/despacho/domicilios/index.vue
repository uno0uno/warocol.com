<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useTenantReactive } from '@/composables/useTenantReactive'
import type { Column } from '~/components/ui/ResponsiveDataView.vue'

definePageMeta({ layout: 'dashboard', module: 'despacho' })

const { t } = useI18n({ useScope: 'global' })

useHead({ title: () => t('despacho.head.domicilios') })

const { formatDateTime, formatCurrency } = useFormatters()
const { currentTenant } = useTenantReactive()

const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const { dateRangeDates, presetDates, formatDateRange, dateRange, clearDateRange } = useDateRangePresets()
const { isoFromDate } = useTenantTimezone()
const statusFilter = ref<string | null>(null)
const orderTypeFilter = ref<string | null>(null)
const statusHeaderFilter = computed({
  get: () => statusFilter.value ?? '',
  set: (value: string | boolean) => {
    statusFilter.value = typeof value === 'string' && value ? value : null
  },
})
const statusLabel = (status: string) => t(`despacho.orderStatuses.${status}`)
const statusHeaderOptions = computed(() => [
  { value: 'pending', label: statusLabel('pending') },
  { value: 'confirmed', label: statusLabel('confirmed') },
  { value: 'preparing', label: statusLabel('preparing') },
  { value: 'delivered', label: statusLabel('delivered') },
  { value: 'completed', label: statusLabel('completed') },
  { value: 'cancelled', label: statusLabel('cancelled') },
])

const sortField = ref('order_date')
const sortDirection = ref<'asc' | 'desc'>('desc')

const PAGE_SIZE = 25
const currentPage = ref(1)

const hasActiveFilters = computed(
  () =>
    !!localSearchTerm.value
    || !!appliedSearch.value
    || !!dateRangeDates.value
    || !!statusFilter.value
    || !!orderTypeFilter.value,
)

const performSearch = () => applySearch(() => { currentPage.value = 1 })

const clearFilters = () => {
  clearSearch()
  clearDateRange()
  statusFilter.value = null
  orderTypeFilter.value = null
  currentPage.value = 1
}

const {
  data: ordersData,
  status: ordersStatus,
  asyncStatus: ordersAsyncStatus,
  error: fetchError,
  refetch: refetchOrders,
} = useQuery({
  key: () => ['online-orders', currentTenant.value?.id, {
    limit: PAGE_SIZE,
    offset: (currentPage.value - 1) * PAGE_SIZE,
    sortField: sortField.value,
    sortDirection: sortDirection.value,
    status: statusFilter.value,
  }],
  query: () => $fetch('/api/online/orders', {
    params: {
      limit: PAGE_SIZE,
      offset: (currentPage.value - 1) * PAGE_SIZE,
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

const ordersTotal = computed(() => ordersData.value?.pagination?.total ?? 0)
const ordersTotalPages = computed(() => {
  const total = ordersTotal.value
  return Math.max(1, Math.ceil(total / PAGE_SIZE))
})
const goToPage = (page: number) => {
  currentPage.value = Math.max(1, Math.min(page, ordersTotalPages.value))
}

watch(() => currentTenant.value?.id, () => {
  currentPage.value = 1
})

watch(dateRangeDates, (val) => {
  if (!val || (val.length === 2 && val[0] && val[1])) {
    currentPage.value = 1
  }
})

watch([statusFilter, orderTypeFilter, sortField, sortDirection], () => {
  currentPage.value = 1
})

const displayOrders = computed(() => {
  const q = appliedSearch.value.trim().toLowerCase()
  const from = dateRange.value.from
  const to = dateRange.value.to

  return ordersRaw.value.filter((order: any) => {
    if (orderTypeFilter.value && order.order_type !== orderTypeFilter.value) return false
    if (from && to) {
      const day = order.order_date ? isoFromDate(new Date(order.order_date)) : ''
      if (!day || day < from || day > to) return false
    }
    if (!q) return true
    const num = String(order.order_number ?? '')
    const email = String(order.verified_email ?? '').toLowerCase()
    const phone = String(order.customer_phone ?? '').toLowerCase()
    return num.includes(q) || email.includes(q) || phone.includes(q)
  })
})

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => { setRefreshHandler(refetchOrders) })
onUnmounted(() => { clearRefreshHandler(refetchOrders) })
registerProgressiveLoading(isRefreshingOrders)

const columns = computed<Column[]>(() => [
  { key: 'order_number', title: t('despacho.common.orderNumber'), sortable: true },
  { key: 'order_date', title: t('despacho.common.date'), sortable: true },
  { key: 'scheduled_time', title: t('despacho.common.scheduled'), sortable: true },
  { key: 'order_type', title: t('despacho.common.type'), sortable: true },
  { key: 'status', title: t('despacho.common.status'), sortable: false },
  { key: 'total_amount', title: t('despacho.common.total'), sortable: true },
  { key: 'verified_email', title: t('despacho.common.customer'), sortable: true },
  { key: 'customer_phone', title: t('despacho.common.phone'), sortable: true },
])

const orderTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    delivery: t('despacho.orderTypes.delivery'),
    pickup: t('despacho.orderTypes.pickup'),
    'dine-in': t('despacho.orderTypes.dineIn'),
  }
  return labels[type] ?? type
}

const { getStatusText, getStatusVariant } = useOnlineOrderStatus()

const handleSort = (event: string | { field: string; direction?: 'asc' | 'desc' }) => {
  const field = typeof event === 'string' ? event : event.field
  const direction = typeof event === 'string'
    ? (sortField.value === event && sortDirection.value === 'asc' ? 'desc' : 'asc')
    : event.direction ?? 'asc'
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
        :search-placeholder="t('despacho.common.searchOrderCustomer')"
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
            class="md:hidden"
            :aria-label="t('despacho.domicilios.filterStatus')"
          >
            <option :value="null">{{ t('despacho.common.status') }}</option>
            <option value="pending">{{ statusLabel('pending') }}</option>
            <option value="confirmed">{{ statusLabel('confirmed') }}</option>
            <option value="preparing">{{ statusLabel('preparing') }}</option>
            <option value="delivered">{{ statusLabel('delivered') }}</option>
            <option value="completed">{{ statusLabel('completed') }}</option>
            <option value="cancelled">{{ statusLabel('cancelled') }}</option>
          </select>
          <select
            v-model="orderTypeFilter"
            :class="filterSelectClass"
            :aria-label="t('despacho.domicilios.filterType')"
          >
            <option :value="null">{{ t('despacho.common.type') }}</option>
            <option value="delivery">{{ t('despacho.orderTypes.delivery') }}</option>
            <option value="pickup">{{ t('despacho.orderTypes.pickup') }}</option>
            <option value="dine-in">{{ t('despacho.orderTypes.dineIn') }}</option>
          </select>
        </template>
      </UiAdvancedFiltersBar>

        <UiResponsiveDataView
          row-size="sm"
          :columns="columns"
          :data="displayOrders"
          :sort-field="sortField"
          :sort-direction="sortDirection"
          :empty-message="t('despacho.domicilios.emptyTitle')"
          :empty-sub-message="t('despacho.domicilios.emptySub')"
          variant="default"
          @sort="handleSort"
          @row-click="viewOrder"
        >
          <template #header-status>
            <UiTableHeaderFilter
              v-model="statusHeaderFilter"
              :title="t('despacho.common.status')"
              filter-type="select"
              :options="statusHeaderOptions"
              :all-label="t('despacho.common.all')"
              align="center"
            />
          </template>

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
                  {{ item.customer_phone || t('despacho.common.noPhone') }} · {{ orderTypeLabel(item.order_type) }} · {{ formatDateTime(item.order_date) }}
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
              {{ value ? formatDateTime(value) : t('despacho.common.immediate') }}
            </span>
          </template>
          <template #cell-order_type="{ value }">
            <UiStatusBadge :value="orderTypeLabel(value)" format="text" variant="info" size="sm" />
          </template>
          <template #cell-status="{ value, row }">
            <UiStatusBadge :variant="getStatusVariant(value)" size="sm" format="text">
              {{ getStatusText(value, row.order_type) }}
            </UiStatusBadge>
          </template>
          <template #cell-total_amount="{ value }">
            <span class="text-sm font-bold text-primary">{{ formatCurrency(value) }}</span>
          </template>
          <template #cell-verified_email="{ value, row }">
            <div class="min-w-0">
              <p class="text-sm text-text-secondary truncate">{{ value ?? '—' }}</p>
            </div>
          </template>
          <template #cell-customer_phone="{ value }">
            <span class="text-sm text-text-secondary">{{ value || t('despacho.common.noPhone') }}</span>
          </template>
        </UiResponsiveDataView>

      <div v-if="ordersTotal > 0" class="flex items-center justify-end px-1 py-2">
        <div class="flex items-center gap-1">
          <button
            :disabled="currentPage <= 1"
            @click="goToPage(1)"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :aria-label="t('ventas.common.primeraPagina')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
          </button>
          <button
            :disabled="currentPage <= 1"
            @click="goToPage(currentPage - 1)"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :aria-label="t('ventas.common.paginaAnterior')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span class="px-3 py-1 text-sm font-medium text-text-primary">{{ currentPage }}</span>
          <button
            :disabled="currentPage >= ordersTotalPages"
            @click="goToPage(currentPage + 1)"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :aria-label="t('ventas.common.paginaSiguiente')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </button>
          <button
            :disabled="currentPage >= ordersTotalPages"
            @click="goToPage(ordersTotalPages)"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :aria-label="t('ventas.common.ultimaPagina')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
